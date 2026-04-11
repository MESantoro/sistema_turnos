document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date();
    const diff = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diff);
    document.getElementById('fecha-semana').value = lunes.toISOString().split('T')[0];
    
    document.getElementById('fecha-semana').addEventListener('change', () => {
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
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('mes-actual').innerText = `${meses[fechaBase.getUTCMonth()]} ${fechaBase.getUTCFullYear()}`;
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
        
        if (!datos) {
            const resPers = await fetch('/api/personal');
            datos = await resPers.json();
        }

        const lista = document.getElementById('lista-personal');
        lista.innerHTML = '';
        if (!Array.isArray(datos)) return;

        datos.forEach(p => {
            const tr = document.createElement('tr');
            tr.dataset.contrato = p.horas_semanales_contrato || 0;
            tr.dataset.mongoId = p._id || '';

            let htmlDias = '';
            const turnos = p.turnos || Array(7).fill({franco:false, tm:{on:false,in:"08:00",out:"14:00"}, tt:{on:false,in:"16:00",out:"20:00"}});

            turnos.forEach((dia, i) => {
                htmlDias += `
                <td class="dia-celda ${dia.franco ? 'bg-franco' : ''}" data-dia="${i}">
                    <div class="d-flex flex-column align-items-center">
                        <div class="form-check form-switch mb-1">
                            <input class="form-check-input sw-franco" type="checkbox" ${dia.franco?'checked':''} onchange="cambioEstado(this)">
                        </div>
                        <div class="tm-line">
                            <input type="checkbox" class="sw-tm" ${dia.tm?.on?'checked':''} ${dia.franco?'disabled':''} onchange="cambioEstado(this)">
                            <input type="text" class="input-time-custom in-tm" value="${dia.tm?.in||'08:00'}" ${(!dia.tm?.on||dia.franco)?'disabled':''} oninput="recalcular(this)">
                            <input type="text" class="input-time-custom out-tm" value="${dia.tm?.out||'14:00'}" ${(!dia.tm?.on||dia.franco)?'disabled':''} oninput="recalcular(this)">
                        </div>
                        <div class="tt-line mt-1">
                            <input type="checkbox" class="sw-tt" ${dia.tt?.on?'checked':''} ${dia.franco?'disabled':''} onchange="cambioEstado(this)">
                            <input type="text" class="input-time-custom in-tt" value="${dia.tt?.in||'16:00'}" ${(!dia.tt?.on||dia.franco)?'disabled':''} oninput="recalcular(this)">
                            <input type="text" class="input-time-custom out-tt" value="${dia.tt?.out||'20:00'}" ${(!dia.tt?.on||dia.franco)?'disabled':''} oninput="recalcular(this)">
                        </div>
                    </div>
                </td>`;
            });

            tr.innerHTML = `
                <td class="text-start p-2">
                    <div class="fw-bold small text-uppercase">${p.apellido}, ${p.nombre}</div>
                    <div class="text-muted" style="font-size:0.7rem">${p.sector} | Leg: <span class="val-leg">${p.legajo}</span></div>
                </td>
                ${htmlDias}
                <td><div class="h6 fw-bold hs-total m-0">0.0</div></td>
                <td><button class="btn btn-sm btn-outline-danger" onclick="borrar('${p._id}')">×</button></td>`;
            lista.appendChild(tr);
            ejecutarCalculoFila(tr);
        });
    } catch (e) { console.error(e); }
}

function cambioEstado(el) {
    const td = el.closest('td');
    const esF = td.querySelector('.sw-franco').checked;
    td.classList.toggle('bg-franco', esF);
    td.querySelectorAll('input:not(.sw-franco)').forEach(i => i.disabled = esF);
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
}

function diff(i, f) {
    const [h1, m1] = i.split(':').map(Number);
    const [h2, m2] = f.split(':').map(Number);
    const mins = (h2*60+m2) - (h1*60+m1);
    return mins > 0 ? mins/60 : 0;
}

async function guardarPlanillaGeneral() {
    const filas = document.querySelectorAll('#lista-personal tr');
    if(filas.length === 0) return;
    Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });
    
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

    const res = await fetch('/api/guardar-planilla', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ fecha_lunes: document.getElementById('fecha-semana').value, datos })
    });
    if (res.ok) Swal.fire({ icon: 'success', title: 'Semana Guardada', timer: 1000, showConfirmButton: false });
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
               <input id="a" class="swal2-input" placeholder="Apellido"><input id="h" type="number" class="swal2-input" placeholder="Horas">
               <select id="s" class="swal2-input"><option value="Caja">Caja</option><option value="Tienda">Tienda</option><option value="Bolsos">Bolsos</option></select>`,
        preConfirm: () => ({ 
            legajo: document.getElementById('l').value, nombre: document.getElementById('n').value, 
            apellido: document.getElementById('a').value, sector: document.getElementById('s').value, 
            horas_semanales_contrato: document.getElementById('h').value, turnos: [] 
        })
    });
    if (f) { 
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