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
    sector: String
});

const Funcionario = mongoose.model('Funcionario', FuncionarioSchema);

const TurnoSchema = new mongoose.Schema({
    funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario' },
    fecha: String,
    entrada: String,
    salida: String
});

const Turno = mongoose.model('Turno', TurnoSchema);

// --- RUTAS DE LA API ---

// Obtener todos los funcionarios
app.get('/api/personal', async (req, res) => {
    try {
        const personal = await Funcionario.find();
        res.json(personal);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Agregar nuevo funcionario
app.post('/api/personal', async (req, res) => {
    try {
        const nuevo = new Funcionario(req.body);
        await nuevo.save();
        res.json(nuevo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Guardar turnos
app.post('/api/turnos', async (req, res) => {
    try {
        const { turnos } = req.body;
        // Limpiamos turnos viejos de esos días para no duplicar
        await Turno.deleteMany({
            fecha: { $in: turnos.map(t => t.fecha) }
        });
        await Turno.insertMany(turnos);
        res.json({ message: 'Turnos guardados' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ruta para que cargue el index.html al entrar al link
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});