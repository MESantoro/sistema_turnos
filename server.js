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
  .then(() => console.log('✅ Conectado exitosamente a MongoDB Atlas'))
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
        const actualizado = await Funcionario.findOneAndUpdate(
            { legajo: req.body.legajo }, req.body, { upsert: true, returnDocument: 'after' }
        );
        res.json(actualizado);
    } catch (err) { res.status(500).send(err); }
});

app.delete('/api/personal/:id', async (req, res) => {
    try { await Funcionario.findByIdAndDelete(req.params.id); res.json({ m: 'ok' }); } catch (err) { res.status(500).send(err); }
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
        res.json({ m: 'Planilla guardada' });
    } catch (err) { res.status(500).send(err); }
});

// Middleware para SPA: sirve el index.html para cualquier ruta no encontrada
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));