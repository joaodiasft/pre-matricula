const state = {
  basicInfo: null,
  selectedSessions: new Map(),
};

const courses = [
  {
    id: "redacao",
    title: "Redação autoral",
    modality: "Redação",
    description:
      "Simulados, correções premium e repertório atualizado para provas do ENEM e vestibulares.",
    sessions: [
      { id: "r1", label: "Terça-feira • 18h às 19h30", seats: 18 },
      { id: "r2", label: "Quinta-feira • 18h às 19h30", seats: 18 },
    ],
  },
  {
    id: "gramatica",
    title: "Gramática aplicada",
    modality: "Gramática",
    description:
      "Interpretação, análise sintática e oratória para dominar a parte objetiva das provas.",
    sessions: [
      { id: "g1", label: "Sexta-feira • 19h às 21h", seats: 20 },
    ],
  },
  {
    id: "exatas",
    title: "Exatas 360º",
    modality: "Exatas",
    description:
      "Integração de Química, Física e Matemática com laboratórios e plantões semanais.",
    sessions: [
      { id: "ex1", label: "Segunda-feira • 19h às 22h", seats: 48 },
      { id: "ex2", label: "Sábado • 8h às 12h", seats: 40 },
    ],
  },
];

const form = document.querySelector("#basic-form");
const saveStatus = document.querySelector("#saveStatus");
const saveButton = document.querySelector("#saveBasicBtn");
const phase3Locked = document.querySelector("#phase3Locked");
const phase3Content = document.querySelector("#phase3Content");
const coursesGrid = document.querySelector("#coursesGrid");
const summaryList = document.querySelector("#summaryList");

const formatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

function setSaveStatus(message, tone = "muted") {
  saveStatus.className = tone;
  saveStatus.textContent = message;
}

function togglePhase3(enabled) {
  if (enabled) {
    phase3Locked.classList.add("hidden");
    phase3Content.classList.remove("hidden");
  } else {
    phase3Locked.classList.remove("hidden");
    phase3Content.classList.add("hidden");
  }
}

function renderCourses() {
  const template = document.querySelector("#course-template");
  coursesGrid.innerHTML = "";

  courses.forEach((course) => {
    const fragment = template.content.cloneNode(true);
    fragment.querySelector("[data-title]").textContent = course.title;
    fragment.querySelector("[data-modality]").textContent = course.modality;
    fragment.querySelector("[data-description]").textContent =
      course.description;

    const sessionWrapper = fragment.querySelector("[data-sessions]");
    course.sessions.forEach((session) => {
      const el = document.createElement("div");
      el.className = "session";
      const isSelected = state.selectedSessions.get(course.id) === session.id;
      el.innerHTML = `
        <strong>${session.label}</strong>
        <span class="muted">${session.seats} vagas disponíveis</span>
        <button class="primary" data-course="${course.id}" data-session="${
        session.id
      }">${isSelected ? "Selecionado" : "Selecionar"}</button>
      `;
      sessionWrapper.appendChild(el);
    });

    coursesGrid.appendChild(fragment);
  });
}

function renderSummary() {
  summaryList.innerHTML = "";
  const basicItem = document.createElement("li");
  basicItem.innerHTML = `<span>Dados básicos</span><span>${
    state.basicInfo ? "Concluído" : "Pendente"
  }</span>`;

  summaryList.appendChild(basicItem);

  courses.forEach((course) => {
    const li = document.createElement("li");
    const selection = state.selectedSessions.get(course.id);
    li.innerHTML = `<span>${course.title}</span><span>${
      selection ? "Selecionado" : "Pendente"
    }</span>`;
    summaryList.appendChild(li);
  });
}

async function fakeApiDelay(result) {
  return new Promise((resolve) => setTimeout(() => resolve(result), 800));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  setSaveStatus("Salvando dados...", "muted");

  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    await fakeApiDelay({ ok: true });
    state.basicInfo = payload;
    togglePhase3(true);
    const now = new Date();
    setSaveStatus(`Dados salvos às ${formatter.format(now)}.`, "muted");
  } catch (error) {
    setSaveStatus("Não foi possível salvar. Tente novamente.", "alert");
  } finally {
    saveButton.disabled = false;
    renderSummary();
  }
});

coursesGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-course]");
  if (!button) return;
  const { course: courseId, session: sessionId } = button.dataset;
  state.selectedSessions.set(courseId, sessionId);
  renderCourses();
  renderSummary();
});

document.querySelector("#confirmCoursesBtn").addEventListener("click", () => {
  const chosen = Array.from(state.selectedSessions.values()).length;
  if (!chosen) {
    alert("Escolha ao menos uma turma.");
    return;
  }
  alert("Turmas confirmadas! Continue para o pagamento.");
});

document.querySelector("#ctaStep2").addEventListener("click", () => {
  window.scrollTo({
    top: document.querySelector("#phase-2").offsetTop - 20,
    behavior: "smooth",
  });
});

renderCourses();
renderSummary();
