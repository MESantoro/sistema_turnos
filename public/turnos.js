document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date();
    const diff = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diff);
    const selector = document.getElementById('fecha-semana');
    selector.value = lunes.toISOString().split('T')[0];
    selector.addEventListener('change', cargar);
    cargar();
});

async function cargar() {
    const fecha = document.getElementById('fecha-semana').value;
    actualizarFechasHeader(fecha);
    try {
        const [resPers, resPlan] = await Promise.all([
            fetch('/api/personal'),
            fetch(`/api/planilla/${fecha}`)
        ]);
        const personalBase = await resPers.json();
        const planillaGuardada = await resPlan.json();

        const lista = document.getElementById('lista-personal');
        lista.innerHTML = '';
        
        const datos = (planillaGuardada || personalBase).map(p => {
            const base = personalBase.find(b => b.legajo == p.legajo);
            return { ...p, _id: p._id || base?._id };
        });

        datos.forEach(p => {
            const tr = document.createElement('tr');
            tr.dataset.contrato = p.horas_semanales_contrato || 0;
            
            let htmlDias = '';
            const turnos = p.turnos?.length === 7 ? p.turnos : Array(7).fill().map(() => ({
                franco: false, tm: { on: true, in: "07:00", out: "14:30" }, tt: { on: true, in: "16:00", out: "19:00" }
            }));

            turnos.forEach((dia, i) => {
                // Lógica de color Rosa para Franco, Blanco para Trabaja
                const colorClase = dia.franco ? 'bg-franco-card' : 'bg-trabaja-card';
                htmlDias += `
                <td class="dia-celda p-1">
                    <div class="card-turno ${colorClase} p-2 rounded-3 border shadow-sm" style="min-width: 105px;">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="lbl-estado small fw-bold text-uppercase" style="font-size:0.65rem">${dia.franco ? 'FRANCO' : 'TRABAJA'}</span>
                            <div class="form-check form-switch m-0">
                                <input class="form-check-input sw-franco" type="checkbox" ${dia.franco?'checked':''} onchange="cambioEstado(this)">
                            </div>
                        </div>
                        <div class="input-group-custom mb-1 d-flex gap-1 align-items-center">
                            <input type="checkbox" class="sw-tm" ${dia.tm.on?'checked':''} ${dia.franco?'disabled':''} onchange="cambioEstado(this)">
                            <input type="text" class="in-tm form-control-sm border-0 rounded-1 text-center" style="width:42px; font-size:0.8rem; padding:2px" value="${dia.tm.in}" ${(!dia.tm.on||dia.franco)?'disabled':''} oninput="recalcular(this)">
                            <input type="text" class="out-tm form-control-sm border-0 rounded-1 text-center" style="width:42px; font-size:0.8rem; padding:2px" value="${dia.tm.out}" ${(!dia.tm.on||dia.franco)?'disabled':''} oninput="recalcular(this)">
                        </div>
                        <div class="input-group-custom d-flex gap-1 align-items-center">
                            <input type="checkbox" class="sw-tt" ${dia.tt.on?'checked':''} ${dia.franco?'disabled':''} onchange="cambioEstado(this)">
                            <input type="text" class="in-tt form-control-sm border-0 rounded-1 text-center" style="width:42px; font-size:0.8rem; padding:2px" value="${dia.tt.in}" ${(!dia.tt.on||dia.franco)?'disabled':''} oninput="recalcular(this)">
                            <input type="text" class="out-tt form-control-sm border-0 rounded-1 text-center" style="width:42px; font-size:0.8rem; padding:2px" value="${dia.tt.out}" ${(!dia.tt.on||dia.franco)?'disabled':''} oninput="recalcular(this)">
                        </div>
                    </div>
                </td>`;
            });

            tr.innerHTML = `
                <td class="text-start align-middle px-3 border-end">
                    <div class="fw-bold" style="font-size:0.85rem">${p.apellido.toUpperCase()}, ${p.nombre.toUpperCase()}</div>
                    <div class="text-muted small" style="font-size:0.75rem">Leg: <span class="val-leg">${p.legajo}</span></div>
                </td>
                ${htmlDias}
                <td class="align-middle text-center border-start">
                    <div class="hs-total fw-bold h5 mb-0">0.0</div>
                    <div class="small text-muted" style="font-size:0.7rem">Contr: <b>${p.horas_semanales_contrato}</b></div>
                </td>
                <td class="align-middle text-center">
                    <button class="btn btn-outline-danger btn-sm rounded-circle shadow-sm" onclick="borrar('${p._id}')" style="width:28px;height:28px;padding:0">×</button>
                </td>`;
            lista.appendChild(tr);
            ejecutarCalculoFila(tr);
        });
    } catch (e) { console.error(e); }
}

function actualizarFechasHeader(fecha) {
    const parts = fecha.split('-');
    const base = new Date(Date.UTC(parts[0], parts[1]-1, parts[2]));
    document.querySelectorAll('#header-dias .fecha-header').forEach((span, i) => {
        const d = new Date(base);
        d.setUTCDate(base.getUTCDate() + i);
        span.innerText = `${d.getUTCDate().toString().padStart(2,'0')}/${(d.getUTCMonth()+1).toString().padStart(2,'0')}`;
    });
}

function cambioEstado(el) {
    const card = el.closest('.card-turno');
    const esF = card.querySelector('.sw-franco').checked;
    // Cambia color de fondo: bg-franco-card (rosa) o bg-trabaja-card (blanco)
    card.className = `card-turno p-2 rounded-3 border shadow-sm ${esF ? 'bg-franco-card' : 'bg-trabaja-card'}`;
    card.querySelector('.lbl-estado').innerText = esF ? 'FRANCO' : 'TRABAJA';
    card.querySelectorAll('input:not(.sw-franco)').forEach(i => i.disabled = esF);
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
    const totalEl = tr.querySelector('.hs-total');
    const contrato = parseFloat(tr.dataset.contrato);
    totalEl.innerText = suma.toFixed(1);
    totalEl.className = `hs-total fw-bold h5 mb-0 ${suma > contrato ? 'text-danger' : 'text-success'}`;
}

function diff(i, f) {
    const [h1, m1] = i.split(':').map(Number);
    const [h2, m2] = f.split(':').map(Number);
    const mins = (h2*60+m2) - (h1*60+m1);
    return mins > 0 ? mins/60 : 0;
}

async function guardarPlanillaGeneral() {
    const datos = Array.from(document.querySelectorAll('#lista-personal tr')).map(tr => ({
        legajo: tr.querySelector('.val-leg').innerText,
        nombre: tr.querySelector('.fw-bold').innerText.split(', ')[1],
        apellido: tr.querySelector('.fw-bold').innerText.split(', ')[0],
        horas_semanales_contrato: tr.dataset.contrato,
        turnos: Array.from(tr.querySelectorAll('.dia-celda')).map(td => ({
            franco: td.querySelector('.sw-franco').checked,
            tm: { on: td.querySelector('.sw-tm').checked, in: td.querySelector('.in-tm').value, out: td.querySelector('.out-tm').value },
            tt: { on: td.querySelector('.sw-tt').checked, in: td.querySelector('.in-tt').value, out: td.querySelector('.out-tt').value }
        }))
    }));
    await fetch('/api/guardar-planilla', { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ fecha_lunes: document.getElementById('fecha-semana').value, datos }) 
    });
    Swal.fire({ icon: 'success', title: 'Semana Guardada', timer: 1000, showConfirmButton: false });
}

async function borrar(id) {
    const res = await Swal.fire({ title: '¿Borrar?', icon: 'warning', showCancelButton: true });
    if (res.isConfirmed) {
        await fetch(`/api/personal/${id}`, { method: 'DELETE' });
        cargar();
    }
}

async function modalNuevo() {
    const { value: f } = await Swal.fire({
        title: 'Nuevo Funcionario',
        html: `<input id="l" class="swal2-input" placeholder="Legajo"><input id="n" class="swal2-input" placeholder="Nombre"><input id="a" class="swal2-input" placeholder="Apellido"><input id="h" type="number" class="swal2-input" placeholder="Horas Contrato">`,
        preConfirm: () => ({ legajo: document.getElementById('l').value, nombre: document.getElementById('n').value, apellido: document.getElementById('a').value, horas_semanales_contrato: document.getElementById('h').value, turnos: [] })
    });
    if (f && f.legajo) { 
        await fetch('/api/personal', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(f) }); 
        cargar(); 
    }
}

function exportarExcel() {
    const data = [["Funcionario", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom", "Total"]];
    document.querySelectorAll('#lista-personal tr').forEach(tr => {
        const fila = [tr.querySelector('.fw-bold').innerText];
        tr.querySelectorAll('.dia-celda').forEach(td => {
            if(td.querySelector('.sw-franco').checked) fila.push("FRANCO");
            else fila.push(`${td.querySelector('.in-tm').value}-${td.querySelector('.out-tm').value} / ${td.querySelector('.in-tt').value}-${td.querySelector('.out-tt').value}`);
        });
        fila.push(tr.querySelector('.hs-total').innerText);
        data.push(fila);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Turnos");
    XLSX.writeFile(wb, `Planilla_${document.getElementById('fecha-semana').value}.xlsx`);
}