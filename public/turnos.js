document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date();
    const diff = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diff);
    const selectorFecha = document.getElementById('fecha-semana');
    selectorFecha.value = lunes.toISOString().split('T')[0];
    
    selectorFecha.addEventListener('change', () => {
        actualizarFechas();
        cargar();
    });

    actualizarFechas();
    cargar();
});

function actualizarFechas() {
    const inputFecha = document.getElementById('fecha-semana').value;
    if(!inputFecha) return;
    const parts = inputFecha.split('-');
    const fechaBase = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    document.querySelectorAll('#header-dias .fecha-header').forEach((span, idx) => {
        const d = new Date(fechaBase);
        d.setUTCDate(fechaBase.getUTCDate() + idx);
        span.innerText = `${d.getUTCDate().toString().padStart(2,'0')}/${(d.getUTCMonth()+1).toString().padStart(2,'0')}`;
    });
}

async function cargar() {
    const fecha = document.getElementById('fecha-semana').value;
    try {
        const resPlanilla = await fetch(`/api/planilla/${fecha}`);
        let datos = await resPlanilla.json();
        
        // Si no hay datos guardados para esa fecha, carga el personal base
        if (!datos || datos.length === 0) {
            const resPers = await fetch('/api/personal');
            datos = await resPers.json();
        }

        const lista = document.getElementById('lista-personal');
        lista.innerHTML = '';
        
        datos.forEach(p => {
            const tr = document.createElement('tr');
            tr.dataset.contrato = p.horas_semanales_contrato || 0;
            
            let htmlDias = '';
            const turnosDef = Array(7).fill().map(() => ({
                franco: false, 
                tm: { on: true, in: "07:00", out: "14:30" }, 
                tt: { on: true, in: "16:00", out: "19:00" }
            }));
            
            const turnos = (p.turnos && p.turnos.length === 7) ? p.turnos : turnosDef;

            turnos.forEach((dia, i) => {
                const colorClase = dia.franco ? 'bg-franco-card shadow-inner' : 'bg-trabaja-card shadow-sm';
                htmlDias += `
                <td class="dia-celda p-1" data-dia="${i}">
                    <div class="card-turno ${colorClase} p-2 rounded-3 border">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="lbl-estado small fw-bold text-uppercase" style="font-size: 0.65rem;">${dia.franco ? 'FRANCO' : 'TRABAJA'}</span>
                            <div class="form-check form-switch m-0">
                                <input class="form-check-input sw-franco" type="checkbox" ${dia.franco?'checked':''} onchange="cambioEstado(this)">
                            </div>
                        </div>
                        <div class="input-group-custom mb-1 d-flex align-items-center gap-1">
                            <input type="checkbox" class="sw-tm" ${dia.tm?.on?'checked':''} ${dia.franco?'disabled':''} onchange="cambioEstado(this)">
                            <input type="text" class="in-tm form-control form-control-sm p-0 text-center border-0 bg-white" style="width:35px; font-size:0.75rem" value="${dia.tm?.in||'07:00'}" ${(!dia.tm?.on||dia.franco)?'disabled':''} oninput="recalcular(this)">
                            <input type="text" class="out-tm form-control form-control-sm p-0 text-center border-0 bg-white" style="width:35px; font-size:0.75rem" value="${dia.tm?.out||'14:30'}" ${(!dia.tm?.on||dia.franco)?'disabled':''} oninput="recalcular(this)">
                        </div>
                        <div class="input-group-custom d-flex align-items-center gap-1">
                            <input type="checkbox" class="sw-tt" ${dia.tt?.on?'checked':''} ${dia.franco?'disabled':''} onchange="cambioEstado(this)">
                            <input type="text" class="in-tt form-control form-control-sm p-0 text-center border-0 bg-white" style="width:35px; font-size:0.75rem" value="${dia.tt?.in||'16:00'}" ${(!dia.tt?.on||dia.franco)?'disabled':''} oninput="recalcular(this)">
                            <input type="text" class="out-tt form-control form-control-sm p-0 text-center border-0 bg-white" style="width:35px; font-size:0.75rem" value="${dia.tt?.out||'19:00'}" ${(!dia.tt?.on||dia.franco)?'disabled':''} oninput="recalcular(this)">
                        </div>
                    </div>
                </td>`;
            });

            tr.innerHTML = `
                <td class="text-start align-middle px-3 border-end">
                    <div class="fw-bold text-dark" style="font-size:0.9rem">${p.apellido.toUpperCase()}, ${p.nombre.toUpperCase()}</div>
                    <div class="text-muted small" style="font-size:0.75rem">${p.sector} | Leg: <span class="val-leg">${p.legajo}</span></div>
                    <div class="small text-primary mt-1">Contrato: <b>${p.horas_semanales_contrato}hs</b></div>
                </td>
                ${htmlDias}
                <td class="align-middle fw-bold hs-total h5 border-start text-center">0.0</td>
                <td class="align-middle text-center"><button class="btn btn-danger btn-sm rounded-circle shadow-sm" onclick="borrar('${p._id}')" style="width:28px; height:28px; padding:0; line-height:1">×</button></td>`;
            
            lista.appendChild(tr);
            ejecutarCalculoFila(tr);
        });
    } catch (e) { console.error("Error cargando:", e); }
}

function cambioEstado(el) {
    const card = el.closest('.card-turno');
    const esF = card.querySelector('.sw-franco').checked;
    const lbl = card.querySelector('.lbl-estado');
    
    // Cambia color de la celda dinámicamente
    card.className = `card-turno p-2 rounded-3 border ${esF ? 'bg-franco-card shadow-inner' : 'bg-trabaja-card shadow-sm'}`;
    lbl.innerText = esF ? 'FRANCO' : 'TRABAJA';
    
    card.querySelectorAll('input:not(.sw-franco)').forEach(i => i.disabled = esF);
    if(!esF) {
        card.querySelector('.in-tm').disabled = !card.querySelector('.sw-tm').checked;
        card.querySelector('.out-tm').disabled = !card.querySelector('.sw-tm').checked;
        card.querySelector('.in-tt').disabled = !card.querySelector('.sw-tt').checked;
        card.querySelector('.out-tt').disabled = !card.querySelector('.sw-tt').checked;
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
    const totalEl = tr.querySelector('.hs-total');
    totalEl.innerText = suma.toFixed(1);
    
    // Control visual de horas vs contrato
    const contrato = parseFloat(tr.dataset.contrato);
    if (suma > contrato) totalEl.classList.add('text-danger');
    else totalEl.classList.remove('text-danger');
}

function diff(i, f) {
    const [h1, m1] = i.split(':').map(Number);
    const [h2, m2] = f.split(':').map(Number);
    const mins = (h2*60+m2) - (h1*60+m1);
    return mins > 0 ? mins/60 : 0;
}

async function guardarPlanillaGeneral() {
    const filas = document.querySelectorAll('#lista-personal tr');
    const datos = Array.from(filas).map(tr => ({
        legajo: tr.querySelector('.val-leg').innerText,
        nombre: tr.querySelector('.fw-bold').innerText.split(', ')[1],
        apellido: tr.querySelector('.fw-bold').innerText.split(', ')[0],
        sector: tr.querySelector('.text-muted').innerText.split(' |')[0],
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
    Swal.fire({ icon: 'success', title: 'Planilla Guardada', timer: 1000, showConfirmButton: false });
}

function exportarExcel() {
    const filas = document.querySelectorAll('#lista-personal tr');
    const data = [["Funcionario", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom", "Total"]];
    filas.forEach(tr => {
        const f = [tr.querySelector('.fw-bold').innerText];
        tr.querySelectorAll('.dia-celda').forEach(td => {
            if(td.querySelector('.sw-franco').checked) f.push("FRANCO");
            else {
                let t = "";
                if(td.querySelector('.sw-tm').checked) t += `${td.querySelector('.in-tm').value}-${td.querySelector('.out-tm').value}`;
                if(td.querySelector('.sw-tt').checked) t += ` / ${td.querySelector('.in-tt').value}-${td.querySelector('.out-tt').value}`;
                f.push(t || "-");
            }
        });
        f.push(tr.querySelector('.hs-total').innerText);
        data.push(f);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Turnos");
    XLSX.writeFile(wb, `Planilla_${document.getElementById('fecha-semana').value}.xlsx`);
}

async function modalNuevo() {
    const { value: f } = await Swal.fire({
        title: 'Nuevo Funcionario',
        html: `<input id="l" class="swal2-input" placeholder="Legajo"><input id="n" class="swal2-input" placeholder="Nombre">
               <input id="a" class="swal2-input" placeholder="Apellido"><input id="h" type="number" class="swal2-input" placeholder="Horas Contrato">
               <select id="s" class="swal2-input"><option value="Caja">Caja</option><option value="Tienda">Tienda</option><option value="Producción">Producción</option></select>`,
        preConfirm: () => ({ 
            legajo: document.getElementById('l').value, nombre: document.getElementById('n').value, 
            apellido: document.getElementById('a').value, sector: document.getElementById('s').value, 
            horas_semanales_contrato: document.getElementById('h').value, turnos: [] 
        })
    });
    if (f && f.legajo) { 
        await fetch('/api/personal', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(f) });
        cargar();
    }
}

async function borrar(id) {
    if (await Swal.fire({ title: '¿Borrar?', showCancelButton: true }).then(r => r.isConfirmed)) {
        await fetch(`/api/personal/${id}`, { method: 'DELETE' });
        cargar();
    }
}