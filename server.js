const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONEXIÓN A MONGODB ATLAS ---
const mongoURI = process.env.DATABASE_URL;

mongoose.connect(mongoURI)
  .then(() => console.log('✅ Conectado exitosamente a MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Error crítico al conectar a MongoDB:', err.message);
  });

// --- MODELOS DE DATOS ---
const FuncionarioSchema = new mongoose.Schema({
    legajo: String,
    nombre: String,
    apellido: String,
    sector: String,
    horas_semanales_contrato: Number,
    turnos: Array
});

const Funcionario = mongoose.model('Funcionario', FuncionarioSchema);

// --- RUTAS DE LA API ---

// Obtener todos
app.get('/api/personal', async (req, res) => {
    try {
        const personal = await Funcionario.find();
        res.json(personal);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Guardar o Actualizar
app.post('/api/personal', async (req, res) => {
    try {
        const { legajo } = req.body;
        // Si ya existe por legajo, lo actualiza. Si no, lo crea.
        const actualizado = await Funcionario.findOneAndUpdate(
            { legajo: legajo },
            req.body,
            { upsert: true, new: true }
        );
        res.json(actualizado);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Borrar
app.delete('/api/personal/:id', async (req, res) => {
    try {
        await Funcionario.findByIdAndDelete(req.params.id);
        res.json({ message: 'Eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ruta para cargar la web
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});