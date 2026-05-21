import sqlite3
import psutil
import time
from datetime import datetime
from threading import Thread, Lock
from flask import Flask, jsonify, render_template
from flask_cors import CORS

# CONFIGURACIÓN 
DB_PATH = 'database.db'
PICO_UMBRAL_CPU = 80.0
INTERVALO_MUESTRA = 3
MAX_REGISTROS = 500

# CONFIGURACIÓN DE TDP Y CONSUMO ENERGÉTICO
# Estos valores son estimaciones típicas, ajústalos según tu hardware
TDP_CPU_MAX = 65.0  # Watts - TDP máximo de tu CPU (ajusta según tu procesador)
TDP_CPU_MIN = 5.0   # Watts - Consumo en reposo
TDP_RAM_PER_GB = 3.0  # Watts por GB de RAM activa (típico: 2-4W por GB)

#  Lock para evitar acceso simultáneo a la base de datos
db_lock = Lock()
limpieza_contador = 0

# Variables para estadísticas
consumo_total_acumulado = 0.0  # Wh (Watt-hora)
ultima_medicion_time = time.time()

# --- 1. FUNCIONES DE BASE DE DATOS ---

def get_db_connection():
    """Crea una conexión a la base de datos con configuración optimizada."""
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.execute('PRAGMA journal_mode=WAL')
    return conn

def init_db():
    """Inicializa la tabla de mediciones si no existe."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mediciones (
                timestamp TEXT PRIMARY KEY,
                cpu_usage REAL,
                ram_usage REAL,
                temp REAL,
                pico_detectado INTEGER,
                tdp_cpu REAL,
                tdp_ram REAL,
                potencia_total REAL,
                energia_acumulada REAL
            )
        """)
        conn.commit()
        conn.close()

def limpiar_registros_antiguos():
    """Elimina registros antiguos, manteniendo solo los últimos MAX_REGISTROS."""
    with db_lock:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            total = cursor.execute("SELECT COUNT(*) FROM mediciones").fetchone()[0]
            
            if total > MAX_REGISTROS:
                cursor.execute("""
                    DELETE FROM mediciones 
                    WHERE timestamp NOT IN (
                        SELECT timestamp 
                        FROM mediciones 
                        ORDER BY timestamp DESC 
                        LIMIT ?
                    )
                """, (MAX_REGISTROS,))
                
                eliminados = cursor.rowcount
                conn.commit()
                print(f"🧹 Limpieza: {eliminados} registros eliminados. Total: {MAX_REGISTROS}")
            
            conn.close()
        except Exception as e:
            print(f" Error en limpieza: {e}")

# --- 2. CÁLCULO DE TDP Y CONSUMO ENERGÉTICO ---

def calcular_tdp_cpu(cpu_percent):
    """
    Calcula el TDP actual del CPU basado en el porcentaje de uso.
    La relación no es lineal, se usa una curva más realista.
    """
    # Modelo no lineal: el consumo aumenta más rápido a cargas altas
    factor = (cpu_percent / 100.0) ** 1.5  # Exponente para simular comportamiento real
    tdp = TDP_CPU_MIN + (TDP_CPU_MAX - TDP_CPU_MIN) * factor
    return round(tdp, 2)

def calcular_tdp_ram(ram_percent):
    """
    Calcula el consumo de RAM basado en la cantidad de memoria usada.
    """
    ram_total_gb = psutil.virtual_memory().total / (1024**3)  # Total en GB
    ram_usada_gb = ram_total_gb * (ram_percent / 100.0)
    tdp_ram = ram_usada_gb * TDP_RAM_PER_GB
    return round(tdp_ram, 2)

def calcular_temperatura(cpu_percent):
    """Estima la temperatura del CPU basada en el uso."""
    TEMP_BASE = 35.0
    TEMP_MAX_RISE = 50.0
    temp = TEMP_BASE + (cpu_percent / 100.0 * TEMP_MAX_RISE)
    return round(temp, 2)

# --- 3. CAPTURA DE DATOS ---

def capturar_datos():
    """Bucle infinito para capturar métricas y guardarlas en SQLite."""
    global limpieza_contador, consumo_total_acumulado, ultima_medicion_time
    
    while True:
        try:
            tiempo_actual = time.time()
            tiempo_transcurrido = (tiempo_actual - ultima_medicion_time) / 3600.0  # horas
            
            # 1. Obtener métricas de psutil
            cpu = psutil.cpu_percent(interval=None) 
            ram = psutil.virtual_memory().percent
            
            # 2. Calcular TDP y consumo energético
            tdp_cpu = calcular_tdp_cpu(cpu)
            tdp_ram = calcular_tdp_ram(ram)
            potencia_total = tdp_cpu + tdp_ram
            
            # 3. Calcular energía acumulada (Wh)
            if tiempo_transcurrido > 0:
                energia_periodo = potencia_total * tiempo_transcurrido
                consumo_total_acumulado += energia_periodo
            
            # 4. Otros datos
            temp = calcular_temperatura(cpu)
            pico = 1 if cpu >= PICO_UMBRAL_CPU else 0
            ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            ultima_medicion_time = tiempo_actual

            # 5. Guardar en SQLite
            with db_lock:
                try:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute(
                        """INSERT OR REPLACE INTO mediciones VALUES 
                        (?, ?, ?, ?, ?, ?, ?, ?, ?)""", 
                        (ts, cpu, ram, temp, pico, tdp_cpu, tdp_ram, 
                         potencia_total, consumo_total_acumulado)
                    )
                    conn.commit()
                except sqlite3.OperationalError as e:
                    print(f" Error SQLite: {e}")
                finally:
                    conn.close()
            
            # 6. Limpieza automática
            limpieza_contador += 1
            if limpieza_contador >= 50:
                limpiar_registros_antiguos()
                limpieza_contador = 0
            
        except Exception as e:
            print(f" Error crítico: {e}")

        time.sleep(INTERVALO_MUESTRA)

# Inicialización
init_db()
data_thread = Thread(target=capturar_datos, daemon=True)
data_thread.start()

# --- 4. SERVIDOR WEB FLASK ---

app = Flask(__name__, static_folder='static', template_folder='static')
CORS(app) 

@app.route('/api/tendencia')
def get_tendencia():
    """Devuelve los últimos 120 puntos para gráficos."""
    with db_lock:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            data = cursor.execute("""
                SELECT timestamp, cpu_usage, ram_usage, pico_detectado,
                       tdp_cpu, tdp_ram, potencia_total
                FROM mediciones 
                ORDER BY timestamp DESC 
                LIMIT 120
            """).fetchall()
        except sqlite3.OperationalError as e:
            print(f" Error tendencia: {e}")
            return jsonify([])
        finally:
            conn.close()
    
    datos_formateados = []
    for row in reversed(data): 
        datos_formateados.append({
            'ts': row[0].split(' ')[1],
            'cpu': row[1],
            'ram': row[2],
            'pico': row[3],
            'tdp_cpu': row[4],
            'tdp_ram': row[5],
            'potencia_total': row[6]
        })
        
    return jsonify(datos_formateados)

@app.route('/api/actual')
def get_actual():
    """Devuelve el dato más reciente y estadísticas."""
    with db_lock:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Dato actual
            data = cursor.execute("""
                SELECT cpu_usage, ram_usage, temp, pico_detectado,
                       tdp_cpu, tdp_ram, potencia_total, energia_acumulada
                FROM mediciones 
                ORDER BY timestamp DESC 
                LIMIT 1
            """).fetchone()
            
            # Estadísticas de TDP (máximo y mínimo de la sesión)
            stats = cursor.execute("""
                SELECT 
                    MAX(tdp_cpu) as cpu_max,
                    MIN(tdp_cpu) as cpu_min,
                    MAX(tdp_ram) as ram_max,
                    MIN(tdp_ram) as ram_min,
                    MAX(potencia_total) as potencia_max,
                    MIN(potencia_total) as potencia_min
                FROM mediciones
            """).fetchone()
            
        except sqlite3.OperationalError as e:
            print(f" Error actual: {e}")
            return jsonify({'error': 'Database error'})
        finally:
            conn.close()
    
    if data:
        pico_count = get_pico_frecuencia()
        
        return jsonify({
            'cpu_actual': round(data[0], 2),
            'ram_actual': round(data[1], 2),
            'temp_actual': round(data[2], 2),
            'pico_frecuencia': pico_count,
            'tdp_cpu': round(data[4], 2),
            'tdp_ram': round(data[5], 2),
            'potencia_total': round(data[6], 2),
            'energia_acumulada': round(data[7], 3),
            'stats': {
                'cpu_max': round(stats[0], 2) if stats[0] else 0,
                'cpu_min': round(stats[1], 2) if stats[1] else 0,
                'ram_max': round(stats[2], 2) if stats[2] else 0,
                'ram_min': round(stats[3], 2) if stats[3] else 0,
                'potencia_max': round(stats[4], 2) if stats[4] else 0,
                'potencia_min': round(stats[5], 2) if stats[5] else 0
            }
        })
    
    return jsonify({'error': 'No data'})

def get_pico_frecuencia():
    """Calcula cuántos picos se han detectado."""
    with db_lock:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            data = cursor.execute("""
                SELECT SUM(pico_detectado) 
                FROM (
                    SELECT pico_detectado 
                    FROM mediciones 
                    ORDER BY timestamp DESC 
                    LIMIT 120
                )
            """).fetchone()
        except sqlite3.OperationalError as e:
            print(f" Error picos: {e}")
            return 0
        finally:
            conn.close()
    
    return data[0] if data and data[0] is not None else 0

@app.route('/')
def index():
    """Sirve el archivo HTML principal."""
    return render_template('index.html')

# --- 5. EJECUCIÓN ---
if __name__ == '__main__':
    print(f" Dashboard Energético iniciando en http://127.0.0.1:5001")
    print(f" TDP CPU configurado: {TDP_CPU_MIN}W (mín) - {TDP_CPU_MAX}W (máx)")
    print(f" TDP RAM: {TDP_RAM_PER_GB}W por GB")
    print(f" Capturando datos cada {INTERVALO_MUESTRA} segundos")
    
    app.run(host='127.0.0.1', port=5001, debug=True, threaded=True)