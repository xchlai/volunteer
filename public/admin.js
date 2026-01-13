const loginCard = document.querySelector("#login-card");
const dashboard = document.querySelector("#dashboard");
const activityCard = document.querySelector("#activity-card");
const submissionCard = document.querySelector("#submission-card");
const personCard = document.querySelector("#person-card");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const activityForm = document.querySelector("#activity-form");
const activityList = document.querySelector("#activity-list");
const submissionList = document.querySelector("#submission-list");
const personList = document.querySelector("#person-list");
const statsContainer = document.querySelector("#stats");
const refreshButton = document.querySelector("#refresh");
const exportButton = document.querySelector("#export");
const resetButton = document.querySelector("#reset-data");
const chartCanvas = document.querySelector("#chart");

let adminPassword = sessionStorage.getItem("adminPassword") || "";
let cachedSubmissions = [];
let chartInstance = null;

const showLoginMessage = (text, isError = false) => {
  loginMessage.textContent = text;
  loginMessage.hidden = false;
  loginMessage.style.borderColor = isError ? "#fecaca" : "#bfdbfe";
  loginMessage.style.background = isError ? "#fef2f2" : "#eff6ff";
  loginMessage.style.color = isError ? "#991b1b" : "#1e3a8a";
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  "X-Admin-Password": adminPassword,
});

const showDashboard = () => {
  loginCard.hidden = true;
  dashboard.hidden = false;
  activityCard.hidden = false;
  submissionCard.hidden = false;
  personCard.hidden = false;
};

const handleAuthFailure = () => {
  sessionStorage.removeItem("adminPassword");
  adminPassword = "";
  loginCard.hidden = false;
  dashboard.hidden = true;
  activityCard.hidden = true;
  submissionCard.hidden = true;
  personCard.hidden = true;
  showLoginMessage("密码失效，请重新登录。", true);
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (response.status === 401 || response.status === 403) {
    handleAuthFailure();
    throw new Error("unauthorized");
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
};

const renderActivities = (activities) => {
  if (!activities.length) {
    activityList.innerHTML = "<p>暂无活动，请先新增。</p>";
    return;
  }

  const rows = activities
    .map(
      (activity) => `
      <tr>
        <td><input data-field="name" data-id="${activity.id}" value="${activity.name}" /></td>
        <td><input data-field="duration" data-id="${activity.id}" type="number" min="1" value="${activity.duration_minutes}" /></td>
        <td class="actions">
          <button data-action="save" data-id="${activity.id}">保存</button>
          <button class="danger" data-action="delete" data-id="${activity.id}">删除</button>
        </td>
      </tr>
    `
    )
    .join("");

  activityList.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>活动名称</th>
          <th>时长（分钟）</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const renderStats = (stats) => {
  statsContainer.innerHTML = `
    <div class="card">
      <span class="badge">志愿者人数</span>
      <h3>${stats.totals.volunteers}</h3>
    </div>
    <div class="card">
      <span class="badge">人次数</span>
      <h3>${stats.totals.participations}</h3>
    </div>
    <div class="card">
      <span class="badge">总时长（分钟）</span>
      <h3>${stats.totals.minutes}</h3>
    </div>
  `;

  const labels = stats.perPerson.map((item) => item.name);
  const minutes = stats.perPerson.map((item) => item.total_minutes);

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "个人累计时长（分钟）",
          data: minutes,
          backgroundColor: "rgba(37, 99, 235, 0.6)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
    },
  });

  if (!stats.perPerson.length) {
    personList.innerHTML = "<p>暂无数据。</p>";
    return;
  }

  const rows = stats.perPerson
    .map(
      (person) => `
      <tr>
        <td>${person.employee_id}</td>
        <td>${person.name}</td>
        <td>${person.total_minutes}</td>
      </tr>
    `
    )
    .join("");

  personList.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>工号</th>
          <th>姓名</th>
          <th>累计时长（分钟）</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const renderSubmissions = (submissions) => {
  cachedSubmissions = submissions;
  if (!submissions.length) {
    submissionList.innerHTML = "<p>暂无登记记录。</p>";
    return;
  }

  const rows = submissions
    .map(
      (submission) => `
      <tr>
        <td>${submission.employee_id}</td>
        <td>${submission.name}</td>
        <td>${submission.activity_name}</td>
        <td>${submission.duration_minutes}</td>
        <td>${submission.updated_at}</td>
        <td><button class="danger" data-action="delete" data-id="${submission.id}">删除</button></td>
      </tr>
    `
    )
    .join("");

  submissionList.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>工号</th>
          <th>姓名</th>
          <th>活动</th>
          <th>时长（分钟）</th>
          <th>更新时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const loadDashboard = async () => {
  const [activities, stats, submissions] = await Promise.all([
    fetchJson("/api/activities"),
    fetchJson("/api/stats", { headers: authHeaders() }),
    fetchJson("/api/submissions", { headers: authHeaders() }),
  ]);

  renderActivities(activities.activities);
  renderStats(stats);
  renderSubmissions(submissions.submissions);
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.querySelector("#adminPassword").value.trim();
  if (!password) {
    showLoginMessage("请输入密码。", true);
    return;
  }
  adminPassword = password;
  sessionStorage.setItem("adminPassword", password);

  try {
    await loadDashboard();
    showDashboard();
  } catch (error) {
    showLoginMessage(error.message || "登录失败。", true);
  }
});

activityForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.querySelector("#activityName").value.trim();
  const duration = Number(document.querySelector("#activityDuration").value);

  if (!name || !duration) {
    alert("请完整填写活动信息。");
    return;
  }

  await fetchJson("/api/activities", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, duration_minutes: duration }),
  });
  activityForm.reset();
  await loadDashboard();
});

activityList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  if (button.dataset.action === "delete") {
    if (!confirm("确认删除该活动？相关登记也会被删除。")) return;
    await fetchJson(`/api/activities/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await loadDashboard();
    return;
  }

  if (button.dataset.action === "save") {
    const nameInput = activityList.querySelector(`input[data-field="name"][data-id="${id}"]`);
    const durationInput = activityList.querySelector(
      `input[data-field="duration"][data-id="${id}"]`
    );

    await fetchJson(`/api/activities/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        name: nameInput.value.trim(),
        duration_minutes: Number(durationInput.value),
      }),
    });
    await loadDashboard();
  }
});

submissionList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  if (!confirm("确认删除该登记记录？")) return;
  await fetchJson(`/api/submissions/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await loadDashboard();
});

refreshButton.addEventListener("click", async () => {
  await loadDashboard();
});

exportButton.addEventListener("click", () => {
  if (!cachedSubmissions.length) {
    alert("暂无数据可导出。");
    return;
  }

  const rows = ["工号,姓名,志愿者活动,时间(分钟)"];
  cachedSubmissions.forEach((row) => {
    rows.push(
      `${row.employee_id},${row.name},${row.activity_name},${row.duration_minutes}`
    );
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "volunteer-records.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

resetButton.addEventListener("click", async () => {
  const confirmed = confirm(
    "确认要初始化数据吗？此操作会删除所有活动设置和用户登记记录，无法恢复。"
  );
  if (!confirmed) return;
  await fetchJson("/api/reset", {
    method: "POST",
    headers: authHeaders(),
  });
  await loadDashboard();
});

if (adminPassword) {
  loadDashboard()
    .then(showDashboard)
    .catch(() => {
      handleAuthFailure();
    });
}
