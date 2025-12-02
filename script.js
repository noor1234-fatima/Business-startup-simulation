// script.js
document.addEventListener('DOMContentLoaded', () => {
  // set current year in footer(s)
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('year' + (i === 1 ? '' : i));
    if (el) el.textContent = new Date().getFullYear();
  }

  // nav toggle for mobile
  const navToggle = document.querySelectorAll('.nav-toggle');
  navToggle.forEach(btn => btn.addEventListener('click', () => {
    const nav = document.querySelector('.nav');
    if (nav) nav.classList.toggle('open');
  }));

  // IDEAS: filter and save
  const chips = document.querySelectorAll('.chip');
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const filter = chip.getAttribute('data-filter') || chip.textContent.toLowerCase();
    filterIdeas(filter);
  }));

  function filterIdeas(tag) {
    const cards = document.querySelectorAll('.idea-card');
    cards.forEach(card => {
      if (tag === 'all') { card.style.display = ''; return; }
      const tags = card.dataset.tags || '';
      card.style.display = tags.includes(tag) ? '' : 'none';
    });
  }

  // Save idea button
  document.querySelectorAll('.save-idea').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.idea-card');
      if (!card) return;
      const title = card.querySelector('h3').textContent;
      saveFavoriteIdea(title);
      e.target.textContent = 'Saved';
      e.target.disabled = true;
    });
  });

  function saveFavoriteIdea(title) {
    const fav = JSON.parse(localStorage.getItem('ss_favs') || '[]');
    if (!fav.includes(title)) {
      fav.push(title);
      localStorage.setItem('ss_favs', JSON.stringify(fav));
    }
  }

  // SIMULATOR logic
  const budgetRange = document.getElementById('budgetRange');
  const budgetVal = document.getElementById('budgetVal');
  if (budgetRange && budgetVal) {
    const showBudget = () => budgetVal.textContent = Number(budgetRange.value).toLocaleString();
    budgetRange.addEventListener('input', showBudget);
    showBudget();
  }

  // preview updates
  const ideaSelect = document.getElementById('ideaSelect');
  const previewIdea = document.getElementById('previewIdea');
  const previewBudget = document.getElementById('previewBudget');
  const previewTeam = document.getElementById('previewTeam');
  const previewMkt = document.getElementById('previewMkt');
  const gaugeBar = document.getElementById('gaugeBar');
  const gaugeText = document.getElementById('gaugeText');
  const scoreBreakdown = document.getElementById('scoreBreakdown');
  const tipsList = document.getElementById('tipsList');

  function updatePreview() {
    if (!ideaSelect) return;
    const ideaOpt = ideaSelect.selectedOptions[0];
    previewIdea.textContent = ideaOpt ? ideaOpt.textContent : '—';
    previewBudget.textContent = `${Number(budgetRange.value).toLocaleString()} PKR`;
    const team = Array.from(document.querySelectorAll('input[name="team"]:checked')).map(i => i.value).join(', ') || 'Founder';
    previewTeam.textContent = team;
    const mkt = document.querySelector('input[name="mkt"]:checked');
    previewMkt.textContent = mkt ? mkt.value.charAt(0).toUpperCase() + mkt.value.slice(1) : '—';
  }

  document.querySelectorAll('input,select').forEach(el => el && el.addEventListener('change', updatePreview));
  updatePreview();

  // core scoring function
  function runSimulation() {
    // gather inputs
    const idea = ideaSelect.value || '';
    const budget = Number(budgetRange.value || 0);
    const dev = Number(document.getElementById('devPct').value || 0);
    const mkt = Number(document.getElementById('mktPct').value || 0);
    const ops = Number(document.getElementById('opsPct').value || 0);
    const teamChecked = Array.from(document.querySelectorAll('input[name="team"]:checked')).map(i => i.value);
    const marketing = document.querySelector('input[name="mkt"]:checked')?.value || 'organic';

    // base score out of 100
    // scoring model (simple, explainable):
    //  - Idea risk: low 12, medium 8, high 4 (market fit)
    //  - Budget factor: log scale mapping 500 => 6, 500k => 25 (more realistic incremental)
    //  - Team factor: each key role adds points (dev, designer, marketing, advisor)
    //  - Allocation fitness: if dev/mkt/ops sum to 100 -> +10; if dev too low for tech idea -> -8
    //  - Marketing choice: ads gives boost but costs more -> weights
    //  - Random jitter small +/- 3 to simulate market randomness

    // idea risk
    const ideaOpt = ideaSelect.selectedOptions[0];
    const risk = ideaOpt ? ideaOpt.dataset.risk : 'medium';
    const ideaScore = risk === 'low' ? 14 : (risk === 'medium' ? 9 : 5);

    // budgetScore: map ln(budget) into [5,28]
    const budScore = Math.min(28, Math.max(5, Math.round(Math.log(Math.max(500, budget)) * 3.2)));

    // team score
    let teamScore = 6; // base (founder)
    const roleWeights = { dev: 8, designer: 5, marketing: 6, advisor: 4 };
    teamChecked.forEach(r => { if (roleWeights[r]) teamScore += roleWeights[r]; });

    // allocation fitness
    let allocScore = 0;
    const totalPct = dev + mkt + ops;
    if (totalPct === 100) allocScore += 10;
    // penalty: if idea is tech and dev% < 30
    const marketType = ideaOpt ? ideaOpt.dataset.market : '';
    if (marketType === 'edu' || marketType === 'tech') {
      if (dev < 30) allocScore -= 8;
    }
    if (mkt < 10) allocScore -= 5;

    // marketing choice
    const mktScore = marketing === 'ads' ? 9 : (marketing === 'hybrid' ? 12 : 6);

    // random jitter
    const jitter = Math.floor(Math.random() * 5) - 2;

    // final score composition
    let raw = ideaScore + budScore + teamScore + allocScore + mktScore + jitter;
    raw = Math.round(Math.max(8, Math.min(95, raw)));

    // breakdown for display
    const breakdown = [
      { k: 'Idea Fit', v: ideaScore },
      { k: 'Budget Strength', v: budScore },
      { k: 'Team Strength', v: teamScore },
      { k: 'Allocation Fitness', v: allocScore },
      { k: 'Marketing Plan', v: mktScore }
    ];

    // tips logic (simple heuristics)
    const tips = [];
    if (raw < 40) {
      tips.push('Consider increasing budget in development or marketing.');
      tips.push('Add at least one specialist (developer/designer/marketer).');
      tips.push('Validate your idea with 5 potential customers before scaling.');
    } else if (raw < 70) {
      tips.push('Good start — tighten allocation to ensure dev and marketing balance.');
      tips.push('Run small paid ad experiments to validate channels.');
    } else {
      tips.push('Strong setup — prepare an MVP and start user testing.');
      tips.push('Begin building partnerships for growth and distribution.');
    }
    if (allocScore < 0) tips.push('Fix allocation percentages to total 100% and align with idea needs.');

    // animate gauge & update preview
    gaugeBar.style.width = raw + '%';
    gaugeText.textContent = raw + '/100';
    scoreBreakdown.innerHTML = breakdown.map(b => `<li>${b.k}: <strong>${b.v}</strong></li>`).join('');
    tipsList.innerHTML = tips.map(t => `<li>${t}</li>`).join('');

    // show result modal
    showResultModal(raw, breakdown, tips, { idea: ideaOpt ? ideaOpt.textContent : '—', budget, team: teamChecked, marketing });

    return { score: raw, breakdown, tips };
  }

  // run button
  const runSimBtn = document.getElementById('runSim');
  if (runSimBtn) runSimBtn.addEventListener('click', () => {
    const result = runSimulation();
    // store last result temporarily
    localStorage.setItem('ss_last_sim', JSON.stringify(result));
    updateSavedListUI();
  });

  // modal handlers
  const resultModal = document.getElementById('resultModal');
  const closeModal = document.getElementById('closeModal');
  function showResultModal(score, breakdown, tips, meta) {
    if (!resultModal) return;
    resultModal.setAttribute('aria-hidden', 'false');
    document.getElementById('resultNumber').textContent = score;
    const txt = score > 75 ? 'High chance of early traction' : (score > 50 ? 'Promising — needs validation' : 'High risk — iterate & validate');
    document.getElementById('resultText').textContent = txt;
    const details = document.getElementById('resultDetails');
    details.innerHTML = `
      <h4>Scenario</h4>
      <p><strong>Idea:</strong> ${meta.idea} — <strong>Budget:</strong> ${meta.budget.toLocaleString()} PKR</p>
      <h4>Breakdown</h4>
      <ul>${breakdown.map(b => `<li>${b.k}: ${b.v}</li>`).join('')}</ul>
      <h4>Tips</h4>
      <ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul>
    `;
  }

  if (closeModal) {
    closeModal.addEventListener('click', () => resultModal.setAttribute('aria-hidden', 'true'));
  }
  document.getElementById('modalClose')?.addEventListener('click', () => resultModal.setAttribute('aria-hidden', 'true'));

  // save scenario
  const saveBtn = document.getElementById('saveSim');
  const modalSave = document.getElementById('modalSave');
  function gatherScenario() {
    const idea = ideaSelect.value;
    const budget = Number(budgetRange.value);
    const dev = Number(document.getElementById('devPct').value || 0);
    const mkt = Number(document.getElementById('mktPct').value || 0);
    const ops = Number(document.getElementById('opsPct').value || 0);
    const team = Array.from(document.querySelectorAll('input[name="team"]:checked')).map(i => i.value);
    const marketing = document.querySelector('input[name="mkt"]:checked')?.value || 'organic';
    const score = Number(gaugeText?.textContent?.split('/')[0] || 0);
    return { id: Date.now(), idea, budget, allocation: { dev, mkt, ops }, team, marketing, score, created: new Date().toISOString() };
  }
  function saveScenarioToStorage(scn) {
    const arr = JSON.parse(localStorage.getItem('ss_scenarios') || '[]');
    arr.unshift(scn);
    localStorage.setItem('ss_scenarios', JSON.stringify(arr));
    updateSavedListUI();
  }
  if (saveBtn) saveBtn.addEventListener('click', () => {
    const scn = gatherScenario();
    saveScenarioToStorage(scn);
    alert('Scenario saved locally. You can view it in the sidebar.');
  });
  if (modalSave) modalSave.addEventListener('click', () => {
    const scn = gatherScenario();
    saveScenarioToStorage(scn);
    resultModal.setAttribute('aria-hidden', 'true');
  });

  // reset
  const resetBtn = document.getElementById('resetSim');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    document.getElementById('simForm').reset();
    budgetRange.value = 50000;
    document.getElementById('devPct').value = 40;
    document.getElementById('mktPct').value = 35;
    document.getElementById('opsPct').value = 25;
    updatePreview();
    gaugeBar.style.width = '0%';
    gaugeText.textContent = '—';
  });

  // saved list UI
  function updateSavedListUI() {
    const list = document.getElementById('savedScenarios');
    if (!list) return;
    const arr = JSON.parse(localStorage.getItem('ss_scenarios') || '[]');
    list.innerHTML = arr.slice(0,6).map(s => `<li>${new Date(s.created).toLocaleString()} — ${s.idea} — ${s.score}/100 <button data-id="${s.id}" class="load-scn">Load</button></li>`).join('');
    document.querySelectorAll('.load-scn').forEach(btn => btn.addEventListener('click', (e) => {
      const id = Number(e.target.dataset.id);
      const arr = JSON.parse(localStorage.getItem('ss_scenarios') || '[]');
      const sel = arr.find(x => x.id === id);
      if (sel) loadScenario(sel);
    }));
  }
  function loadScenario(s) {
    // set fields
    ideaSelect.value = s.idea;
    budgetRange.value = s.budget;
    document.getElementById('devPct').value = s.allocation.dev;
    document.getElementById('mktPct').value = s.allocation.mkt;
    document.getElementById('opsPct').value = s.allocation.ops;
    document.querySelectorAll('input[name="team"]').forEach(i => i.checked = s.team.includes(i.value));
    document.querySelectorAll('input[name="mkt"]').forEach(i => i.checked = (i.value === s.marketing));
    updatePreview();
    gaugeBar.style.width = s.score + '%';
    gaugeText.textContent = s.score + '/100';
    alert('Scenario loaded into the simulator.');
  }
  updateSavedListUI();

  // CONTACT form handling (client-side)
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('cname').value.trim();
      const email = document.getElementById('cemail').value.trim();
      const msg = document.getElementById('cmessage').value.trim();
      if (!name || !email || !msg) {
        document.getElementById('contactMsg').textContent = 'Please fill all fields.';
        return;
      }
      // For demo, we store in localStorage (explain in documentation)
      const contacts = JSON.parse(localStorage.getItem('ss_contacts') || '[]');
      contacts.unshift({ name, email, msg, date: new Date().toISOString() });
      localStorage.setItem('ss_contacts', JSON.stringify(contacts));
      document.getElementById('contactMsg').textContent = 'Message saved locally (demo). Thank you!';
      contactForm.reset();
    });
    document.getElementById('clearContact')?.addEventListener('click', () => contactForm.reset());
  }

  // small UX: update preview periodically
  setInterval(updatePreview, 600);
});
