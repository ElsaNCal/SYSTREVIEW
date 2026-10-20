// evidence-explorer-widget.mjs — Interactive evidence database explorer
// anywidget ESM module for MyST
// Handles multiple evidence schema variants from different EXPERT agents

function render({ model, el }) {
  const data = JSON.parse(model.get('evidence_data') || '{}');
  const sections = data.sections || [];
  const findings = data.findings || [];
  const conflicts = data.conflicts || [];
  const figureData = data.figure_data || [];
  
  const height = model.get('height') || '700px';
  
  // === Schema normalization helpers ===
  function normConflict(c) {
    // Handle 4+ different conflict schemas
    let desc = c.nature_of_conflict || c.description || c.topic || '—';
    let reason = c.likely_reason || c.resolution_notes || c.resolution_status || '';
    let doiA = c.paper_a_doi || '';
    let doiB = c.paper_b_doi || '';
    let sideA = '', sideB = '';
    
    // Schema: side_a/side_b as strings or objects {position, evidence_description}
    if (c.side_a) {
      if (typeof c.side_a === 'string') { sideA = c.side_a; }
      else if (c.side_a.position) { sideA = c.side_a.position; }
    }
    if (c.side_b) {
      if (typeof c.side_b === 'string') { sideB = c.side_b; }
      else if (c.side_b.position) { sideB = c.side_b.position; }
    }
    
    // Schema: side_a_dois/side_b_dois arrays
    if (c.side_a_dois) { doiA = c.side_a_dois[0] || ''; }
    if (c.side_b_dois) { doiB = c.side_b_dois[0] || ''; }
    // Schema: side_a/side_b objects with evidence_dois
    if (!doiA && c.side_a && typeof c.side_a === 'object' && c.side_a.evidence_dois) { doiA = c.side_a.evidence_dois[0] || ''; }
    if (!doiB && c.side_b && typeof c.side_b === 'object' && c.side_b.evidence_dois) { doiB = c.side_b.evidence_dois[0] || ''; }
    
    // Schema: sides array [{position, evidence_dois}]
    if (c.sides && Array.isArray(c.sides)) {
      if (c.sides[0]) { sideA = c.sides[0].position || ''; doiA = (c.sides[0].evidence_dois||[])[0] || ''; }
      if (c.sides[1]) { sideB = c.sides[1].position || ''; doiB = (c.sides[1].evidence_dois||[])[0] || ''; }
    }
    
    // Schema: paper_dois array
    if (!doiA && c.paper_dois && Array.isArray(c.paper_dois)) {
      doiA = c.paper_dois[0] || '';
      doiB = c.paper_dois[1] || '';
    }
    
    // Schema: finding_dois
    if (!doiA && c.finding_dois && Array.isArray(c.finding_dois)) {
      doiA = c.finding_dois[0] || '';
      doiB = c.finding_dois[1] || '';
    }
    
    return { desc, reason, doiA, doiB, sideA, sideB, section: c.section || '' };
  }
  
  function normFigData(fd) {
    let name = fd.comparison_name || fd.title || fd.comparison_title || fd.comparison_id || fd.figure_id || '—';
    let reveals = fd.what_it_reveals || fd.description || '';
    let plotType = fd.suggested_plot_type || fd.comparison_type || '—';
    let papers = (fd.papers || []).map(p => ({
      doi: p.doi || '', citeKey: p.cite_key || p.citeKey || '',
      value: (p.value && p.value !== 'None' && p.value !== 'null') ? p.value : '', valueSrc: p.value_source_sentence || '',
      metric: p.metric || '', system: p.study_system || '',
      method: p.method || '', condition: p.condition || '',
    }));
    // Deduplicate papers by cite_key (keep first occurrence)
    const seenKeys = new Set();
    papers = papers.filter(p => {
      const key = p.citeKey || p.doi;
      if (!key || seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });
    let homogeneity = '';
    const hc = fd.homogeneity_check;
    if (typeof hc === 'string') homogeneity = hc;
    else if (hc && typeof hc === 'object') {
      const parts = [];
      if (hc.scope_region_uniform === 'false' || hc.scope_region_uniform === false) parts.push('Region scope varies');
      if (hc.scope_population_uniform === 'false' || hc.scope_population_uniform === false) parts.push('Population scope varies');
      if (hc.taxonomic_level_uniform === 'false' || hc.taxonomic_level_uniform === false) parts.push('Taxonomic level varies');
      if (hc.n_definition_uniform === 'false' || hc.n_definition_uniform === false) parts.push('Sample definition varies');
      if (hc.caveats) {
        if (Array.isArray(hc.caveats)) parts.push(...hc.caveats);
        else if (typeof hc.caveats === 'string') parts.push(hc.caveats);
      }
      homogeneity = parts.join('; ') || 'No issues noted';
    }
    return { name, reveals, plotType, papers, nPapers: papers.length, section: fd.section || '',
             homogeneity, xAxis: fd.x_axis || '', yAxis: fd.y_axis || '',
             region: fd.scope_region || '', population: fd.scope_population || '' };
  }
  
  // Build the UI
  el.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'evidence-explorer';
  container.style.cssText = `max-height:${height};overflow:auto;font-family:system-ui,-apple-system,sans-serif;`;
  
  // Tab bar
  const tabs = ['Overview', 'Findings', 'Conflicts', 'Figure Data'];
  const tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;gap:0;border-bottom:2px solid #e0e0e0;margin-bottom:16px;';
  
  const panels = {};
  tabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.textContent = tab;
    btn.style.cssText = `padding:10px 20px;border:none;background:${i===0?'#2563eb':'#f5f5f5'};color:${i===0?'white':'#666'};cursor:pointer;font-size:14px;font-weight:600;border-radius:8px 8px 0 0;margin-right:2px;transition:all 0.2s;`;
    btn.addEventListener('click', () => {
      tabBar.querySelectorAll('button').forEach(b => { b.style.background='#f5f5f5'; b.style.color='#666'; });
      btn.style.background = '#2563eb'; btn.style.color = 'white';
      Object.values(panels).forEach(p => p.style.display = 'none');
      panels[tab].style.display = 'block';
    });
    tabBar.appendChild(btn);
  });
  container.appendChild(tabBar);
  
  // === OVERVIEW PANEL ===
  const overview = document.createElement('div');
  const totalFindings = findings.length;
  const replicated = findings.filter(f => f.tier === 'independently_replicated').length;
  const replPct = totalFindings > 0 ? (replicated/totalFindings*100).toFixed(1) : 0;
  
  overview.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
      <div style="background:#eff6ff;padding:16px;border-radius:8px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#2563eb;">${totalFindings}</div>
        <div style="font-size:12px;color:#666;margin-top:4px;">Total Findings</div>
      </div>
      <div style="background:#f0fdf4;padding:16px;border-radius:8px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#16a34a;">${replPct}%</div>
        <div style="font-size:12px;color:#666;margin-top:4px;">Independently Replicated</div>
      </div>
      <div style="background:#fef3c7;padding:16px;border-radius:8px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#d97706;">${conflicts.length}</div>
        <div style="font-size:12px;color:#666;margin-top:4px;">Cross-Study Conflicts</div>
      </div>
      <div style="background:#faf5ff;padding:16px;border-radius:8px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#9333ea;">${figureData.length}</div>
        <div style="font-size:12px;color:#666;margin-top:4px;">Figure Comparisons</div>
      </div>
    </div>
    <h4 style="margin:0 0 12px 0;font-size:15px;">Per-Section Summary</h4>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#f8fafc;">
        <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;">Section</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0;">Papers</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0;">Findings</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0;">Conflicts</th>
      </tr></thead>
      <tbody>${sections.map(s => `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px;">&sect;${s.section} ${s.title}</td>
        <td style="padding:8px;text-align:right;">${s.papers}</td>
        <td style="padding:8px;text-align:right;">${s.findings}</td>
        <td style="padding:8px;text-align:right;">${s.conflicts}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  panels['Overview'] = overview;
  container.appendChild(overview);
  
  // === FINDINGS PANEL ===
  const findingsPanel = document.createElement('div');
  findingsPanel.style.display = 'none';
  
  const filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search claims, DOIs, study systems...';
  searchInput.style.cssText = 'flex:1;min-width:200px;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;';
  
  const sectionFilter = document.createElement('select');
  sectionFilter.style.cssText = 'padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;';
  sectionFilter.innerHTML = '<option value="">All Sections</option>' + 
    sections.map(s => `<option value="${s.section}">&sect;${s.section} ${s.title}</option>`).join('');
  
  const tierFilter = document.createElement('select');
  tierFilter.style.cssText = 'padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;';
  tierFilter.innerHTML = '<option value="">All Statuses</option><option value="independently_replicated">Independently Replicated</option><option value="replication_unknown">Replication Unknown</option><option value="within_lab_replicated">Within-Lab Replicated</option><option value="contested">Contested</option><option value="single_study">Single Study</option>';
  
  filterBar.appendChild(searchInput);
  filterBar.appendChild(sectionFilter);
  filterBar.appendChild(tierFilter);
  findingsPanel.appendChild(filterBar);
  
  const findingsCount = document.createElement('div');
  findingsCount.style.cssText = 'font-size:12px;color:#666;margin-bottom:8px;';
  findingsPanel.appendChild(findingsCount);
  
  const findingsTable = document.createElement('div');
  findingsTable.style.cssText = 'max-height:450px;overflow:auto;';
  findingsPanel.appendChild(findingsTable);
  
  function renderFindings() {
    const q = searchInput.value.toLowerCase();
    const sec = sectionFilter.value;
    const tier = tierFilter.value;
    
    let filtered = findings.filter(f => {
      if (sec && String(f.section) !== sec) return false;
      if (tier && f.tier !== tier) return false;
      if (q && !(f.claim||'').toLowerCase().includes(q) && 
              !(f.doi||'').toLowerCase().includes(q) &&
              !(f.study_system||'').toLowerCase().includes(q) &&
              !(f.cite_key||'').toLowerCase().includes(q)) return false;
      return true;
    });
    
    findingsCount.textContent = `Showing ${Math.min(filtered.length, 200)} of ${filtered.length} findings`;
    
    const tierColors = {independently_replicated:'#dcfce7', replication_unknown:'#fef9c3', within_lab_replicated:'#dbeafe', contested:'#fecaca', single_study:'#f3e8ff', not_applicable_review:'#f3f4f6'};
    const tierLabels = {independently_replicated:'Replicated', replication_unknown:'Unknown', within_lab_replicated:'Within-Lab', contested:'Contested', single_study:'Single Study', not_applicable_review:'Review'};
    
    findingsTable.innerHTML = `<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:11px;">
      <colgroup>
        <col style="width:4%;">
        <col style="width:12%;">
        <col style="width:34%;">
        <col style="width:18%;">
        <col style="width:14%;">
        <col style="width:18%;">
      </colgroup>
      <thead><tr style="background:#f8fafc;position:sticky;top:0;">
        <th style="padding:5px 6px;text-align:left;border-bottom:2px solid #e2e8f0;">&sect;</th>
        <th style="padding:5px 6px;text-align:left;border-bottom:2px solid #e2e8f0;">Cite Key</th>
        <th style="padding:5px 6px;text-align:left;border-bottom:2px solid #e2e8f0;">Claim</th>
        <th style="padding:5px 6px;text-align:left;border-bottom:2px solid #e2e8f0;">Effect Size</th>
        <th style="padding:5px 6px;text-align:left;border-bottom:2px solid #e2e8f0;">System</th>
        <th style="padding:5px 6px;text-align:left;border-bottom:2px solid #e2e8f0;">Replication</th>
      </tr></thead>
      <tbody>${filtered.slice(0, 200).map(f => `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:4px 6px;">${f.section}</td>
        <td style="padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><a href="https://doi.org/${f.doi}" target="_blank" style="color:#2563eb;text-decoration:none;font-size:11px;">${f.cite_key||''}</a></td>
        <td style="padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(f.claim||'').replace(/"/g,'&quot;')}">${(f.claim||'').substring(0,100)}${(f.claim||'').length>100?'\u2026':''}</td>
        <td style="padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#666;" title="${(f.effect_size||'').toString().replace(/"/g,'&quot;')}">${(f.effect_size||'\u2014').toString().substring(0,45)}${(f.effect_size||'').toString().length>45?'\u2026':''}</td>
        <td style="padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#666;">${(f.study_system||'\u2014').substring(0,25)}</td>
        <td style="padding:4px 6px;"><span style="background:${tierColors[f.tier]||'#f3f4f6'};padding:2px 6px;border-radius:10px;font-size:10px;white-space:nowrap;">${tierLabels[f.tier]||f.tier||'\u2014'}</span></td>
      </tr>`).join('')}</tbody>
    </table>${filtered.length > 200 ? '<div style="padding:8px;text-align:center;color:#666;font-size:12px;">Showing first 200. Use filters to narrow.</div>' : ''}`;
  }
  
  searchInput.addEventListener('input', renderFindings);
  sectionFilter.addEventListener('change', renderFindings);
  tierFilter.addEventListener('change', renderFindings);
  renderFindings();
  
  panels['Findings'] = findingsPanel;
  container.appendChild(findingsPanel);
  
  // === CONFLICTS PANEL (handles all schema variants) ===
  const conflictsPanel = document.createElement('div');
  conflictsPanel.style.display = 'none';
  
  const normConflicts = conflicts.map(normConflict);
  conflictsPanel.innerHTML = `<h4 style="margin:0 0 16px 0;">Cross-Study Conflicts (${normConflicts.length})</h4>` +
    normConflicts.map(c => `
      <div style="background:#fff;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="font-weight:600;color:#991b1b;margin-bottom:8px;">&sect;${c.section}: ${c.desc}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px;">
          <div style="background:#fef2f2;padding:10px;border-radius:6px;">
            <div style="font-size:11px;color:#666;margin-bottom:4px;">Side A</div>
            ${c.sideA ? `<div style="font-size:12px;margin-bottom:4px;">${c.sideA}</div>` : ''}
            ${c.doiA ? `<a href="https://doi.org/${c.doiA}" target="_blank" style="font-size:11px;color:#2563eb;">${c.doiA}</a>` : '<span style="font-size:11px;color:#999;">No DOI</span>'}
          </div>
          <div style="background:#eff6ff;padding:10px;border-radius:6px;">
            <div style="font-size:11px;color:#666;margin-bottom:4px;">Side B</div>
            ${c.sideB ? `<div style="font-size:12px;margin-bottom:4px;">${c.sideB}</div>` : ''}
            ${c.doiB ? `<a href="https://doi.org/${c.doiB}" target="_blank" style="font-size:11px;color:#2563eb;">${c.doiB}</a>` : '<span style="font-size:11px;color:#999;">No DOI</span>'}
          </div>
        </div>
        ${c.reason ? `<div style="font-size:12px;color:#666;"><strong>Resolution:</strong> ${c.reason}</div>` : ''}
      </div>`).join('');
  
  panels['Conflicts'] = conflictsPanel;
  container.appendChild(conflictsPanel);
  
  // === FIGURE DATA PANEL (handles all schema variants) ===
  const figPanel = document.createElement('div');
  figPanel.style.display = 'none';
  
  const normFigs = figureData.map(normFigData);
  figPanel.innerHTML = `<h4 style="margin:0 0 16px 0;">Cross-Study Figure Comparisons (${normFigs.length})</h4>` +
    normFigs.map(fd => `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
        <div style="font-weight:600;font-size:15px;margin-bottom:6px;color:#1e293b;">&sect;${fd.section}: ${fd.name}</div>
        ${fd.reveals ? `<div style="font-size:13px;color:#475569;margin-bottom:10px;line-height:1.5;">${fd.reveals}</div>` : ''}
        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#64748b;margin-bottom:12px;">
          <span><strong>Type:</strong> ${fd.plotType}</span>
          <span><strong>Papers:</strong> ${fd.nPapers}</span>
          ${fd.region ? `<span><strong>Region:</strong> ${fd.region}</span>` : ''}
          ${fd.population ? `<span><strong>Population:</strong> ${fd.population}</span>` : ''}
          ${fd.xAxis ? `<span><strong>X-axis:</strong> ${fd.xAxis}</span>` : ''}
          ${fd.yAxis ? `<span><strong>Y-axis:</strong> ${fd.yAxis}</span>` : ''}
        </div>
        ${fd.papers.length > 0 ? `
        <div style="margin-bottom:10px;">
          <div style="font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;">Per-Study Data Points:</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead><tr style="background:#f8fafc;">
              <th style="padding:5px 8px;text-align:left;border-bottom:1px solid #e2e8f0;">Study</th>
              <th style="padding:5px 8px;text-align:left;border-bottom:1px solid #e2e8f0;">Reported Value</th>
              <th style="padding:5px 8px;text-align:left;border-bottom:1px solid #e2e8f0;">System</th>
              <th style="padding:5px 8px;text-align:left;border-bottom:1px solid #e2e8f0;">Method</th>
            </tr></thead>
            <tbody>${fd.papers.map(p => `<tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:5px 8px;">${p.citeKey ? `<a href="https://doi.org/${p.doi}" target="_blank" style="color:#2563eb;text-decoration:none;">${p.citeKey}</a>` : (p.doi ? `<a href="https://doi.org/${p.doi}" target="_blank" style="color:#2563eb;text-decoration:none;">${p.doi.substring(0,30)}</a>` : '\u2014')}</td>
              <td style="padding:5px 8px;max-width:280px;line-height:1.3;">${(p.value || '\u2014').toString().substring(0,150)}</td>
              <td style="padding:5px 8px;color:#666;">${(p.system || '\u2014').substring(0,40)}</td>
              <td style="padding:5px 8px;color:#666;">${(p.method || '\u2014').substring(0,40)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>` : ''}
        ${fd.papers.some(p => p.valueSrc) ? `
        <details style="margin-bottom:8px;">
          <summary style="font-size:11px;color:#64748b;cursor:pointer;font-weight:600;">\ud83d\udcdd Source Sentences (click to expand)</summary>
          <div style="padding:8px;background:#f8fafc;border-radius:4px;margin-top:4px;">
            ${fd.papers.filter(p => p.valueSrc).map(p => `
              <div style="font-size:11px;margin-bottom:6px;line-height:1.4;">
                <strong>${p.citeKey || '\u2014'}:</strong>
                <span style="color:#475569;font-style:italic;">"${p.valueSrc.substring(0,300)}${p.valueSrc.length > 300 ? '...' : ''}"</span>
              </div>`).join('')}
          </div>
        </details>` : ''}
        ${fd.homogeneity ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;font-size:11px;line-height:1.4;">
          <strong style="color:#92400e;">\u26a0\ufe0f Comparability:</strong>
          <span style="color:#78350f;"> ${fd.homogeneity.substring(0,400)}${fd.homogeneity.length > 400 ? '...' : ''}</span>
        </div>` : ''}
      </div>`).join('');
  
  panels['Figure Data'] = figPanel;
  container.appendChild(figPanel);
  
  el.appendChild(container);
}

export default { render };
