const activitySelect = document.querySelector("#activity");
const form = document.querySelector("#signup-form");
const message = document.querySelector("#signup-message");

const showMessage = (text, isError = false) => {
  message.textContent = text;
  message.style.borderColor = isError ? "#fecaca" : "#bfdbfe";
  message.style.background = isError ? "#fef2f2" : "#eff6ff";
  message.style.color = isError ? "#991b1b" : "#1e3a8a";
  message.hidden = false;
};

const loadActivities = async () => {
  const response = await fetch("/api/activities");
  const data = await response.json();
  activitySelect.innerHTML = "";
  data.activities.forEach((activity) => {
    const option = document.createElement("option");
    option.value = activity.id;
    option.textContent = `${activity.name}（${activity.duration_minutes} 分钟）`;
    activitySelect.append(option);
  });
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.hidden = true;
  const activityIds = Array.from(form.activity.selectedOptions).map((option) =>
    Number(option.value)
  );
  const submissionMode = form.querySelector(
    "input[name='submissionMode']:checked"
  )?.value;
  const payload = {
    employee_id: form.employeeId.value.trim(),
    name: form.name.value.trim(),
    activity_ids: activityIds,
    submission_mode: submissionMode,
  };

  if (
    !payload.employee_id ||
    !payload.name ||
    activityIds.length === 0 ||
    !submissionMode
  ) {
    showMessage("请完整填写信息。", true);
    return;
  }

  const response = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();
    showMessage(data.error || "提交失败，请稍后重试。", true);
    return;
  }

  const successMessage =
    submissionMode === "append"
      ? "登记成功！已保留此前活动并更新当前选择。"
      : "登记成功！如重复提交，系统会自动覆盖此前记录。";
  showMessage(successMessage, false);
  form.reset();
});

loadActivities().catch(() => {
  showMessage("活动列表加载失败，请联系管理员。", true);
});
