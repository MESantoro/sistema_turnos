document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date();
    const diffLunes = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diffLunes);
    document.getElementById('fecha-semana').value = lunes.toISOString().split('T')[0];
    actualizarFechas();
    cargar();
});

function actualizarFechas() {
    const inputFecha = document.getElementById('fecha-semana').value;
    if(!inputFecha) return;
    const parts = inputFecha.split('-');
    const fechaBase = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('mes-actual').innerText = `${nombresMeses[fechaBase.getUTCMonth()]} ${fechaBase.getUTCFullYear()}`;
    const headers = document.querySelectorAll('#header-dias .fecha-header');
    headers.forEach((span, idx) => {
        const d = new Date(fechaBase);
        d.setUTCDate(fechaBase.getUTCDate() + idx);
        span.innerText = d.getUTCDate().toString().padStart(2, '0') + "/" + (d.getUTCMonth() + 1).toString().padStart(2, '0');
    });
}

async function cargar() {
    const res = await fetch('/api/personal');
    const data = await res.json();
    const lista = document.getElementById('lista-personal');
    lista.innerHTML = '';

    data.forEach(p => {
        const turnos = typeof p.turnos === 'string' ? JSON.parse(p.turnos) : p.turnos;
        const tr = document.createElement('tr');
        tr.dataset.id = p.id;
        tr.dataset.contrato = p.horas_semanales_contrato;

        let htmlDias = '';
        turnos.forEach((dia, i) => {
            htmlDias += `
                <td class="dia-celda ${dia.franco ? 'bg-franco' : ''}" data-dia="${i}">
                    <div class="d-flex flex-column align-items-center">
                        <div class="form-check form-switch mb-1">
                            <input class="form-check-input sw-franco" type="checkbox" ${dia.franco ? 'checked' : ''} onchange="cambioEstado(this)">
                            <span class="label-franco">${dia.franco ? 'FRANCO' : 'TRABAJA'}</span>
                        </div>
                        <div class="tm-line">
                            <input type="checkbox" class="sw-tm" ${dia.tm.on ? 'checked' : ''} ${dia.franco ? 'disabled' : ''} onchange="cambioEstado(this)">
                            <input type="text" class="input-time-custom in-tm" value="${dia.tm.in}" ${(!dia.tm.on || dia.franco) ? 'disabled' : ''} oninput="recalcular(this)">
                            <input type="text" class="input-time-custom out-tm" value="${dia.tm.out}" ${(!dia.tm.on || dia.franco) ? 'disabled' : ''} oninput="recalcular(this)">
                        </div>
                        <div class="tt-line">
                            <input type="checkbox" class="sw-tt" ${dia.tt.on ? 'checked' : ''} ${dia.franco ? 'disabled' : ''} onchange="cambioEstado(this)">
                            <input type="text" class="input-time-custom in-tt" value="${dia.tt.in}" ${(!dia.tt.on || dia.franco) ? 'disabled' : ''} oninput="recalcular(this)">
                            <input type="text" class="input-time-custom out-tt" value="${dia.tt.out}" ${(!dia.tt.on || dia.franco) ? 'disabled' : ''} oninput="recalcular(this)">
                        </div>
                    </div>
                </td>`;
        });

        tr.innerHTML = `
            <td class="text-start p-3">
                <div class="fw-bold text-uppercase" style="font-size:0.85rem;">${p.apellido}, ${p.nombre}</div>
                <div class="text-muted small">${p.sector} | Leg: <span class="val-leg">${p.legajo}</span></div>
                <div class="small mt-1 text-primary">Meta: <b>${p.horas_semanales_contrato}h</b></div>
            </td>
            ${htmlDias}
            <td><div class="h5 fw-bold hs-total m-0">0.0</div><div class="diff-hs small fw-bold"></div></td>
            <td>
                <div class="d-grid gap-1">
                    <button class="btn btn-outline-success btn-sm" onclick="guardar(this)"><i class='bx bx-save'></i></button>
                    <button class="btn btn-outline-danger btn-sm" onclick="borrar(${p.id})"><i class='bx bx-trash'></i></button>
                </div>
            </td>`;
        lista.appendChild(tr);
        ejecutarCalculoFila(tr);
    });
}

function cambioEstado(el) {
    const td = el.closest('td');
    const esF = td.querySelector('.sw-franco').checked;
    td.classList.toggle('bg-franco', esF);
    td.querySelector('.label-franco').innerText = esF ? 'FRANCO' : 'TRABAJA';
    td.querySelectorAll('input:not(.sw-franco)').forEach(i => i.disabled = esF);
    if(!esF) {
        td.querySelector('.in-tm').disabled = !td.querySelector('.sw-tm').checked;
        td.querySelector('.out-tm').disabled = !td.querySelector('.sw-tm').checked;
        td.querySelector('.in-tt').disabled = !td.querySelector('.sw-tt').checked;
        td.querySelector('.out-tt').disabled = !td.querySelector('.sw-tt').checked;
    }
    ejecutarCalculoFila(el.closest('tr'));
}

function recalcular(el) { ejecutarCalculoFila(el.closest('tr')); }

function ejecutarCalculoFila(tr) {
    let suma = 0;
    tr.querySelectorAll('.dia-celda').forEach(td => {
        if (!td.querySelector('.sw-franco').checked) {
            if (td.querySelector('.sw-tm').checked) suma += diff(td.querySelector('.in-tm').value, td.querySelector('.out-tm').value);
            if (td.querySelector('.sw-tt').checked) suma += diff(td.querySelector('.in-tt').value, td.querySelector('.out-tt').value);
        }
    });
    tr.querySelector('.hs-total').innerText = suma.toFixed(1);
    const meta = parseFloat(tr.dataset.contrato);
    const d = suma - meta;
    tr.querySelector('.diff-hs').innerText = `${d >= 0 ? '+' : ''}${d.toFixed(1)}h`;
    tr.querySelector('.diff-hs').className = `diff-hs small fw-bold ${d==0?'text-success':(d>0?'text-danger':'text-warning')}`;
}

function diff(i, f) {
    const [h1, m1] = i.split(':').map(Number);
    const [h2, m2] = f.split(':').map(Number);
    const mins = (h2*60+m2) - (h1*60+m1);
    return mins > 0 ? mins/60 : 0;
}

function extraerDatosFila(tr) {
    const turnos = Array.from(tr.querySelectorAll('.dia-celda')).map(td => ({
        franco: td.querySelector('.sw-franco').checked,
        tm: { on: td.querySelector('.sw-tm').checked, in: td.querySelector('.in-tm').value, out: td.querySelector('.out-tm').value },
        tt: { on: td.querySelector('.sw-tt').checked, in: td.querySelector('.in-tt').value, out: td.querySelector('.out-tt').value }
    }));
    return {
        legajo: tr.querySelector('.val-leg').innerText,
        nombre: tr.querySelector('.fw-bold').innerText.split(', ')[1],
        apellido: tr.querySelector('.fw-bold').innerText.split(', ')[0],
        sector: tr.querySelector('.text-muted').innerText.split(' |')[0],
        horas_semanales_contrato: tr.dataset.contrato,
        turnos: turnos
    };
}

async function guardar(btn) {
    const payload = extraerDatosFila(btn.closest('tr'));
    await fetch('/api/sectores', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
    Swal.fire({ icon: 'success', title: 'Guardado', timer: 600, showConfirmButton: false });
}

async function guardarPlanillaGeneral() {
    const filas = document.querySelectorAll('#lista-personal tr');
    if(filas.length === 0) return;
    Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });
    const datos = Array.from(filas).map(tr => extraerDatosFila(tr));
    const res = await fetch('/api/guardar-planilla', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ fecha_lunes: document.getElementById('fecha-semana').value, datos: datos })
    });
    if (res.ok) Swal.fire({ icon: 'success', title: 'Planilla Guardada' });
}

function exportarExcel() {
    const filas = document.querySelectorAll('#lista-personal tr');
    const dataExcel = [["Funcionario", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo", "Total HS"]];
    filas.forEach(tr => {
        const nombre = tr.querySelector('.fw-bold').innerText;
        const fila = [nombre];
        tr.querySelectorAll('.dia-celda').forEach(td => {
            if(td.querySelector('.sw-franco').checked) fila.push("FRANCO");
            else {
                let t = "";
                if(td.querySelector('.sw-tm').checked) t += `${td.querySelector('.in-tm').value}-${td.querySelector('.out-tm').value}`;
                if(td.querySelector('.sw-tt').checked) t += ` / ${td.querySelector('.in-tt').value}-${td.querySelector('.out-tt').value}`;
                fila.push(t || "S/T");
            }
        });
        fila.push(tr.querySelector('.hs-total').innerText);
        dataExcel.push(fila);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataExcel);
    XLSX.utils.book_append_sheet(wb, ws, "Planilla");
    XLSX.writeFile(wb, `Planilla_${document.getElementById('fecha-semana').value}.xlsx`);
}

async function modalNuevo() {
    const { value: f } = await Swal.fire({
        title: 'Agregar Personal',
        html: `<input id="l" class="swal2-input" placeholder="Legajo"><input id="n" class="swal2-input" placeholder="Nombre">
               <input id="a" class="swal2-input" placeholder="Apellido"><input id="h" type="number" class="swal2-input" placeholder="Horas Contrato">
               <select id="s" class="swal2-input"><option value="Caja">Caja</option><option value="Tienda">Tienda</option><option value="Bolsos">Bolsos</option></select>`,
        preConfirm: () => ({ 
            legajo: document.getElementById('l').value, nombre: document.getElementById('n').value, 
            apellido: document.getElementById('a').value, sector: document.getElementById('s').value, 
            horas_semanales_contrato: document.getElementById('h').value, 
            turnos: Array(7).fill({franco:false, tm:{on:true,in:"07:00",out:"14:30"}, tt:{on:true,in:"16:00",out:"19:00"}}) 
        })
    });
    if (f) {
        await fetch('/api/sectores', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(f) });
        cargar();
    }
}

async function borrar(id) {
    const res = await Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true });
    if (res.isConfirmed) {
        await fetch(`/api/personal/${id}`, { method: 'DELETE' });
        cargar();
    }
}