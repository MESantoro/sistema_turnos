const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'sistema_turnos'
});

db.connect(err => {
    if (err) console.error('Error MySQL:', err.message);
    else console.log('Servidor conectado a sistema_turnos');
});

// Orden descendente por ID para que el nuevo aparezca arriba
app.get('/api/personal', (req, res) => {
    db.query("SELECT * FROM personal ORDER BY id DESC", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/sectores', (req, res) => {
    const { legajo, nombre, apellido, sector, horas_semanales_contrato, turnos } = req.body;
    const sql = `INSERT INTO personal (legajo, nombre, apellido, sector, horas_semanales_contrato, turnos) 
                 VALUES (?, ?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 nombre=VALUES(nombre), apellido=VALUES(apellido), sector=VALUES(sector), 
                 horas_semanales_contrato=VALUES(horas_semanales_contrato), turnos=VALUES(turnos)`;
    db.query(sql, [legajo, nombre, apellido, sector, horas_semanales_contrato, JSON.stringify(turnos)], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
    });
});

app.post('/api/guardar-planilla', (req, res) => {
    const { fecha_lunes, datos } = req.body;
    const sql = "INSERT INTO planillas_guardadas (fecha_lunes, datos_completos) VALUES (?, ?)";
    db.query(sql, [fecha_lunes, JSON.stringify(datos)], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ ok: true });
    });
});

app.delete('/api/personal/:id', (req, res) => {
    db.query("DELETE FROM personal WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ ok: true });
    });
});

app.listen(3000, () => console.log("Servidor en http://localhost:3000"));