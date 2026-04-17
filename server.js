const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('✅ MongoDB Conectado'))
  .catch(err => console.error('❌ Error MongoDB:', err));

const Funcionario = mongoose.model('Funcionario', new mongoose.Schema({
    legajo: String, nombre: String, apellido: String, sector: String,
    horas_semanales_contrato: Number, turnos: Array
}));

const Planilla = mongoose.model('Planilla', new mongoose.Schema({
    fecha_lunes: String,
    datos: Array
}));

app.get('/api/personal', async (req, res) => {
    try { res.json(await Funcionario.find()); } catch (err) { res.status(500).send(err); }
});

app.post('/api/personal', async (req, res) => {
    try {
        const query = { legajo: req.body.legajo };
        const op = { upsert: true, new: true };
        const actualizado = await Funcionario.findOneAndUpdate(query, req.body, op);
        res.json(actualizado);
    } catch (err) { res.status(500).send(err); }
});

app.delete('/api/personal/:id', async (req, res) => {
    try {
        if (!req.params.id || req.params.id === 'undefined') return res.status(400).send("ID requerido");
        await Funcionario.findByIdAndDelete(req.params.id);
        res.json({ m: 'ok' });
    } catch (err) { res.status(500).send(err); }
});

app.get('/api/planilla/:fecha', async (req, res) => {
    try {
        const p = await Planilla.findOne({ fecha_lunes: req.params.fecha });
        res.json(p ? p.datos : null);
    } catch (err) { res.status(500).send(err); }
});

app.post('/api/guardar-planilla', async (req, res) => {
    try {
        const { fecha_lunes, datos } = req.body;
        await Planilla.findOneAndUpdate({ fecha_lunes }, { datos }, { upsert: true });
        res.json({ m: 'ok' });
    } catch (err) { res.status(500).send(err); }
});

app.use((req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.listen(PORT, () => console.log(`🚀 Servidor listo en puerto ${PORT}`));