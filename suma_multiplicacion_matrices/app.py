from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html') # Usar el mismo HTML de la versión local

@app.route('/calcular', methods=['POST'])
def calcular():
    data = request.json
    m1 = data['m1']
    m2 = data['m2']
    op = data['operacion']
    
    filas = len(m1)
    cols = len(m1[0])
    resultado = []

    for i in range(filas):
        fila_res = []
        for j in range(cols):
            if op == 'sumar':
                fila_res.append(m1[i][j] + m2[i][j])
            else:
                fila_res.append(m1[i][j] * m2[i][j])
        resultado.append(fila_res)
        
    return jsonify({'resultado': resultado})

if __name__ == '__main__':
    app.run(port=5000)