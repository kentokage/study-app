(() => {
  const difficultyEl = document.getElementById('difficulty');
  const newProblemBtn = document.getElementById('new-problem');
  const problemEl = document.getElementById('problem');
  const answerEl = document.getElementById('answer');
  const checkBtn = document.getElementById('check');
  const feedbackEl = document.getElementById('feedback');
  const scoreEl = document.getElementById('score');
  const correctEl = document.getElementById('correct');
  const incorrectEl = document.getElementById('incorrect');
  const resetScoreBtn = document.getElementById('reset-score');

  let current = {a: 0, b: 0, answer: 0};
  let stats = {score: 0, correct: 0, incorrect: 0};

  function rangeForDifficulty(d) {
    if (d === 'easy') return 5;
    if (d === 'medium') return 12;
    return 20; // hard
  }

  function randInt(max) {
    return Math.floor(Math.random() * max) + 1;
  }

  function newProblem() {
    const max = rangeForDifficulty(difficultyEl.value);
    const a = randInt(max);
    const b = randInt(max);
    current = {a, b, answer: a * b};
    problemEl.textContent = `${a} × ${b} = ?`;
    feedbackEl.textContent = '';
    answerEl.value = '';
    answerEl.focus();
  }

  function updateStatsDisplay() {
    scoreEl.textContent = stats.score;
    correctEl.textContent = stats.correct;
    incorrectEl.textContent = stats.incorrect;
  }

  function checkAnswer() {
    const val = answerEl.value.trim();
    if (val === '') {
      feedbackEl.textContent = 'Enter an answer.';
      return;
    }
    const user = Number(val);
    if (Number.isNaN(user)) {
      feedbackEl.textContent = 'Please enter a valid number.';
      return;
    }
    if (user === current.answer) {
      feedbackEl.textContent = 'Correct! 🎉';
      stats.correct += 1;
      stats.score += 10;
    } else {
      feedbackEl.textContent = `Incorrect — the correct answer is ${current.answer}.`;
      stats.incorrect += 1;
      stats.score = Math.max(0, stats.score - 5);
    }
    updateStatsDisplay();
  }

  // Event listeners
  newProblemBtn.addEventListener('click', newProblem);
  checkBtn.addEventListener('click', () => {
    checkAnswer();
    // Load a new problem after a short delay so user sees feedback
    setTimeout(newProblem, 900);
  });

  answerEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      checkBtn.click();
    }
  });

  resetScoreBtn.addEventListener('click', () => {
    stats = {score: 0, correct: 0, incorrect: 0};
    updateStatsDisplay();
  });

  // Initialize
  updateStatsDisplay();
  newProblem();
})();
