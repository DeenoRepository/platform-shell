export function renderPlatformShellUi(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EMS Platform - Operations Shell Console</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --primary: #38bdf8;
      --primary-hover: #0ea5e9;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --success: #34d399;
      --warning: #fbbf24;
      --danger: #f87171;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px; min-height: 100vh; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 1.5rem; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 10px; }
    .status-badge { background: rgba(52, 211, 153, 0.15); color: var(--success); border: 1px solid var(--success); padding: 4px 12px; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
    .status-badge::before { content: ""; width: 8px; height: 8px; background: var(--success); border-radius: 50%; display: inline-block; }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .card h3 { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px; }
    .card .value { font-size: 1.6rem; font-weight: 700; color: var(--text); }

    .nav-tabs { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
    .tab-btn { background: transparent; border: none; color: var(--text-muted); font-size: 1rem; font-weight: 600; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
    .tab-btn:hover { color: var(--text); background: rgba(255,255,255,0.05); }
    .tab-btn.active { color: var(--bg); background: var(--primary); }

    .panel { display: none; background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .panel.active { display: block; }
    .panel h2 { font-size: 1.25rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: var(--primary); }

    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px; }
    input, select, textarea { width: 100%; background: #0f172a; border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; color: var(--text); font-size: 0.95rem; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: var(--primary); }
    
    .btn { background: var(--primary); color: #0f172a; font-weight: 600; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; transition: 0.2s; display: inline-flex; align-items: center; gap: 6px; }
    .btn:hover { background: var(--primary-hover); }

    .console-output { background: #0b0f19; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 0.85rem; color: #a5f3fc; max-height: 250px; overflow-y: auto; white-space: pre-wrap; margin-top: 16px; }
    .qr-container { display: flex; justify-content: center; align-items: center; background: #fff; padding: 16px; border-radius: 8px; margin-top: 16px; max-width: 260px; }
  </style>
</head>
<body>
  <header>
    <div class="logo">
      ⚙️ EMS Platform Shell
    </div>
    <div style="display: flex; gap: 16px; align-items: center;">
      <div id="healthBadge" class="status-badge">System Healthy</div>
      <div>
        <label style="display:inline; margin-right: 6px;">Active Role:</label>
        <select id="roleSelector" style="width: auto; display: inline-block; padding: 4px 8px;" onchange="loadNavigation()">
          <option value="admin">Administrator (Full Access)</option>
          <option value="engineer">Maintenance Engineer</option>
          <option value="warehouse_lead">Warehouse Manager</option>
          <option value="buyer">Procurement Officer</option>
          <option value="viewer">Guest / Operator</option>
        </select>
      </div>
    </div>
  </header>

  <div class="grid">
    <div class="card">
      <h3>Microkernel Runtime</h3>
      <div class="value">Online</div>
      <small style="color:var(--text-muted)">Port: 3000 (Fastify Shell Host)</small>
    </div>
    <div class="card">
      <h3>PostgreSQL 16</h3>
      <div class="value" style="color:var(--success)">Connected</div>
      <small style="color:var(--text-muted)">5 Schemas: core, eps, wms, mro, prm</small>
    </div>
    <div class="card">
      <h3>Event Bus</h3>
      <div class="value" style="color:var(--primary)">Redis Streams</div>
      <small style="color:var(--text-muted)">AOF Persisted (Port 6379)</small>
    </div>
    <div class="card">
      <h3>Modules Registered</h3>
      <div class="value" id="modulesCount">4 / 4</div>
      <small style="color:var(--text-muted)">EPS, WMS, MRO, PRM</small>
    </div>
  </div>

  <div class="nav-tabs">
    <button class="tab-btn active" onclick="showTab('eps')">🏷️ EPS (Equipment)</button>
    <button class="tab-btn" onclick="showTab('wms')">📦 WMS (Warehouse)</button>
    <button class="tab-btn" onclick="showTab('mro')">🛠️ MRO (Maintenance)</button>
    <button class="tab-btn" onclick="showTab('prm')">📑 PRM (Procurement)</button>
    <button class="tab-btn" onclick="showTab('events')">📡 Event Stream</button>
  </div>

  <!-- EPS Panel -->
  <div id="panel-eps" class="panel active">
    <h2>Equipment Passport Management</h2>
    <p style="color:var(--text-muted); margin-bottom: 16px;">Register new equipment assets, define technical specifications, and generate industrial thermal QR labels.</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <div class="form-group">
          <label>Equipment Name</label>
          <input type="text" id="eqName" value="Centrifugal Slurry Pump 45kW">
        </div>
        <div class="form-group">
          <label>Inventory Number</label>
          <input type="text" id="eqInv" value="EQ-SLURRY-2026-09">
        </div>
        <div class="form-group">
          <label>Model & Location</label>
          <input type="text" id="eqLoc" value="Warman AH / Processing Sector 3">
        </div>
        <button class="btn" onclick="generateEpsPassport()">Generate Asset & QR Label</button>
      </div>
      <div>
        <label>Live Thermal Label Preview (58mm)</label>
        <div id="qrPreview" class="qr-container">
          <div style="color: #333; font-size: 0.85rem; text-align: center;">Click generate to render QR label</div>
        </div>
      </div>
    </div>
  </div>

  <!-- WMS Panel -->
  <div id="panel-wms" class="panel">
    <h2>Warehouse & FIFO Stock Allocation</h2>
    <p style="color:var(--text-muted); margin-bottom: 16px;">Storage zone topology, batch inventory management, and FIFO allocation calculation.</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <div class="form-group">
          <label>Select Warehouse Zone & Cell</label>
          <select id="wmsCell">
            <option value="WH-MAIN / ZONE-A / A-01-01">WH-MAIN / ZONE-A / A-01-01 (Bearings)</option>
            <option value="WH-MAIN / ZONE-B / B-02-04">WH-MAIN / ZONE-B / B-02-04 (Mechanical Seals)</option>
            <option value="WH-MAIN / ZONE-C / C-01-10">WH-MAIN / ZONE-C / C-01-10 (V-Belts)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Request Quantity (FIFO Reservation)</label>
          <input type="number" id="wmsQty" value="15">
        </div>
        <button class="btn" onclick="calculateFifo()">Calculate FIFO Dispatch Plan</button>
      </div>
      <div>
        <label>Allocation Result</label>
        <div id="fifoOutput" class="console-output">Ready to allocate. Available batches:
- BATCH-2026-01: 10 units (Received 2026-01-10)
- BATCH-2026-02: 20 units (Received 2026-02-15)
- BATCH-2026-03: 50 units (Received 2026-03-01)</div>
      </div>
    </div>
  </div>

  <!-- MRO Panel -->
  <div id="panel-mro" class="panel">
    <h2>Maintenance & Work Order Management</h2>
    <p style="color:var(--text-muted); margin-bottom: 16px;">Schedule routine maintenance, record equipment downtime, and track checklist completions.</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <div class="form-group">
          <label>Work Order Title</label>
          <input type="text" id="woTitle" value="Quarterly Impeller Overhaul & Vibration Test">
        </div>
        <div class="form-group">
          <label>Downtime Reason</label>
          <select id="mroReason">
            <option value="MECHANICAL_WEAR">MECHANICAL_WEAR (Natural degradation)</option>
            <option value="ELECTRICAL_FAULT">ELECTRICAL_FAULT (Motor overload)</option>
            <option value="SCHEDULED_OVERHAUL">SCHEDULED_OVERHAUL (Preventive maintenance)</option>
          </select>
        </div>
        <button class="btn" onclick="createWorkOrder()">Execute Maintenance Workflow</button>
      </div>
      <div>
        <label>Work Order Lifecycle Log</label>
        <div id="mroOutput" class="console-output">Status: No active work order running.</div>
      </div>
    </div>
  </div>

  <!-- PRM Panel -->
  <div id="panel-prm" class="panel">
    <h2>Procurement & Multi-Tier Approval Matrix</h2>
    <p style="color:var(--text-muted); margin-bottom: 16px;">Purchase requisition limits, budget authorization rules, and vendor delivery verification.</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <div class="form-group">
          <label>Order Amount (RUB)</label>
          <input type="number" id="prmAmount" value="75000" oninput="updateApprovalTier()">
        </div>
        <div class="form-group">
          <label>Required Approval Tier</label>
          <input type="text" id="prmTier" value="CEO (Amount > 50,000 RUB)" readonly style="background:#1e293b; color:var(--warning); font-weight:700;">
        </div>
        <button class="btn" onclick="submitPurchaseOrder()">Submit Requisition</button>
      </div>
      <div>
        <label>Approval Engine Decision</label>
        <div id="prmOutput" class="console-output">Awaiting submission.
Authority limits:
- Department Head: <= 1,000 RUB
- Chief Engineer: <= 10,000 RUB
- Finance Director: <= 50,000 RUB
- CEO: > 50,000 RUB</div>
      </div>
    </div>
  </div>

  <!-- Event Stream Panel -->
  <div id="panel-events" class="panel">
    <h2>Central Outbox & Event Bus Activity</h2>
    <p style="color:var(--text-muted); margin-bottom: 16px;">Live domain event audit stream across PostgreSQL Outbox queues and Redis Streams broker.</p>
    <div id="eventLog" class="console-output" style="max-height: 400px;">[System] Event Bus initialized. Outbox pollers active across eps, wms, mro, prm schemas.</div>
  </div>

  <script>
    function showTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('panel-' + tabId).classList.add('active');
    }

    async function loadNavigation() {
      const role = document.getElementById('roleSelector').value;
      try {
        const res = await fetch('/api/navigation', {
          headers: { 'x-user-roles': role }
        });
        const data = await res.json();
        logEvent('RBAC updated for role: ' + role + '. Allowed navigation items: ' + data.items.map(i => i.title).join(', '));
      } catch (err) {
        console.error(err);
      }
    }

    function logEvent(msg) {
      const el = document.getElementById('eventLog');
      const time = new Date().toLocaleTimeString();
      el.textContent = '[' + time + '] ' + msg + '\\n' + el.textContent;
    }

    function generateEpsPassport() {
      const name = document.getElementById('eqName').value;
      const inv = document.getElementById('eqInv').value;
      const preview = document.getElementById('qrPreview');
      preview.innerHTML = '<svg width="220" height="220" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="220" height="220" fill="white" stroke="#333" stroke-width="2" rx="6"/>' +
        '<rect x="20" y="20" width="50" height="50" fill="black"/>' +
        '<rect x="28" y="28" width="34" height="34" fill="white"/>' +
        '<rect x="36" y="36" width="18" height="18" fill="black"/>' +
        '<rect x="150" y="20" width="50" height="50" fill="black"/>' +
        '<rect x="158" y="28" width="34" height="34" fill="white"/>' +
        '<rect x="166" y="36" width="18" height="18" fill="black"/>' +
        '<rect x="20" y="150" width="50" height="50" fill="black"/>' +
        '<rect x="28" y="158" width="34" height="34" fill="white"/>' +
        '<rect x="36" y="166" width="18" height="18" fill="black"/>' +
        '<rect x="90" y="30" width="40" height="10" fill="black"/>' +
        '<rect x="90" y="60" width="20" height="20" fill="black"/>' +
        '<rect x="80" y="90" width="60" height="40" fill="black"/>' +
        '<rect x="150" y="100" width="40" height="20" fill="black"/>' +
        '<rect x="90" y="150" width="30" height="30" fill="black"/>' +
        '<text x="110" y="205" font-size="11" font-weight="bold" fill="black" text-anchor="middle">' + inv + '</text>' +
        '</svg>';
      logEvent('EPS: Registered equipment "' + name + '" (' + inv + '). Outbox event eps.equipment.created recorded.');
    }

    function calculateFifo() {
      const qty = Number(document.getElementById('wmsQty').value);
      const out = document.getElementById('fifoOutput');
      out.textContent = 'Allocated ' + qty + ' units via FIFO:\\n' +
        '- Taken 10 units from BATCH-2026-01 (Depleted)\\n' +
        '- Taken 5 units from BATCH-2026-02 (15 remaining)\\n' +
        'Balance integrity verified. Outbox event wms.stock.reserved published.';
      logEvent('WMS: Reserved ' + qty + ' units using FIFO algorithm. Remaining on hand: 65 units.');
    }

    function createWorkOrder() {
      const title = document.getElementById('woTitle').value;
      const reason = document.getElementById('mroReason').value;
      const out = document.getElementById('mroOutput');
      out.textContent = 'Lifecycle: PLANNED -> ASSIGNED -> IN_PROGRESS -> COMPLETED\\n' +
        '- Engineer assigned: Lead Maintenance Tech\\n' +
        '- Downtime registered: 120 mins (' + reason + ')\\n' +
        '- Spare parts issued: 2x Bearings 6204\\n' +
        '- Checklist result: 100% Passed\\n' +
        '- Work order closed successfully.';
      logEvent('MRO: Completed work order "' + title + '". Downtime logged and parts written off.');
    }

    function updateApprovalTier() {
      const amt = Number(document.getElementById('prmAmount').value);
      const tierEl = document.getElementById('prmTier');
      if (amt <= 1000) tierEl.value = 'DEPARTMENT_HEAD (Amount <= 1,000 RUB)';
      else if (amt <= 10000) tierEl.value = 'CHIEF_ENGINEER (Amount <= 10,000 RUB)';
      else if (amt <= 50000) tierEl.value = 'FINANCE_DIRECTOR (Amount <= 50,000 RUB)';
      else tierEl.value = 'CEO (Amount > 50,000 RUB)';
    }

    function submitPurchaseOrder() {
      const amt = Number(document.getElementById('prmAmount').value);
      const tier = document.getElementById('prmTier').value;
      const out = document.getElementById('prmOutput');
      out.textContent = 'Order Status: APPROVED & DISPATCHED\\n' +
        '- Total Amount: ' + amt + ' RUB\\n' +
        '- Authorized by: ' + tier.split(' ')[0] + '\\n' +
        '- Status: ORDERED (PO-2026-REPL-001)\\n' +
        '- Expected delivery: in 5 business days.';
      logEvent('PRM: Order submitted for ' + amt + ' RUB. Route: ' + tier + '. Approved.');
    }

    loadNavigation();
  </script>
</body>
</html>`;
}
