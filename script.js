 const sudokuEl = document.getElementById('sudoku');
    const livesEl = document.getElementById('lives-count');
    const timerEl = document.getElementById('timer-count');
    const difficultyEl = document.getElementById('current-difficulty');
    const themeBtn = document.getElementById('theme-toggle');
    const refreshBtn = document.getElementById('refresh-btn');
    const solveBtn = document.getElementById('solve-btn');
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const hintBtn = document.getElementById('hint-btn');
    const difficultyModal = document.getElementById('difficulty-modal');
    const correctSound = document.getElementById('correct-sound');

    let lives, timer, interval, currentDifficulty = 'medium';
    let library = [];
    let selectedCell = null;
    let hintsUsed = 0;
    let gameStartTime = null;

    // Difficulty settings
    const difficultySettings = {
      easy: { name: 'Easy', cellsToRemove: 35, color: '🟢' },
      medium: { name: 'Medium', cellsToRemove: 45, color: '🟡' },
      hard: { name: 'Hard', cellsToRemove: 55, color: '🟠' },
      expert: { name: 'Expert', cellsToRemove: 60, color: '🔴' }
    };

    // Save/Load System
    function saveGame() {
      const gameState = {
        difficulty: currentDifficulty,
        lives: lives,
        timer: timer,
        hintsUsed: hintsUsed,
        gameStartTime: gameStartTime,
        puzzle: getCurrentPuzzleState(),
        solution: window.currentSolution
      };
      
      localStorage.setItem('sudoku_save', JSON.stringify(gameState));
      
      // Visual feedback
      saveBtn.textContent = '✅ Saved!';
      setTimeout(() => {
        saveBtn.textContent = '💾 Save';
      }, 1500);
    }

    function loadGame() {
      const savedGame = localStorage.getItem('sudoku_save');
      if (!savedGame) {
        alert('❌ Tidak ada game tersimpan!');
        return;
      }

      try {
        const gameState = JSON.parse(savedGame);
        
        // Restore game state
        currentDifficulty = gameState.difficulty;
        lives = gameState.lives;
        timer = gameState.timer;
        hintsUsed = gameState.hintsUsed || 0;
        gameStartTime = gameState.gameStartTime;
        window.currentSolution = gameState.solution;
        
        // Update UI
        livesEl.textContent = lives;
        timerEl.textContent = timer;
        difficultyEl.textContent = difficultySettings[currentDifficulty].color + ' ' + difficultySettings[currentDifficulty].name;
        
        // Restore puzzle
        restorePuzzleState(gameState.puzzle);
        
        // Resume timer
        clearInterval(interval);
        interval = setInterval(() => {
          timer++;
          timerEl.textContent = timer;
        }, 1000);
        
        // Visual feedback
        loadBtn.textContent = '✅ Loaded!';
        setTimeout(() => {
          loadBtn.textContent = '📁 Load';
        }, 1500);
        
      } catch (error) {
        alert('❌ Error loading game!');
        console.error('Load game error:', error);
      }
    }

    function getCurrentPuzzleState() {
      const state = [];
      const cells = sudokuEl.querySelectorAll('.cell');
      
      cells.forEach((cell, index) => {
        const row = Math.floor(index / 9);
        const col = index % 9;
        
        if (!state[row]) state[row] = [];
        
        if (cell.classList.contains('fixed')) {
          state[row][col] = {
            value: parseInt(cell.textContent),
            type: 'fixed'
          };
        } else {
          const input = cell.querySelector('input');
          if (input) {
            state[row][col] = {
              value: input.disabled ? parseInt(input.value) : 0,
              type: input.disabled ? 'solved' : 'empty'
            };
          }
        }
      });
      
      return state;
    }

    function restorePuzzleState(puzzleState) {
      sudokuEl.innerHTML = '';
      
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cell = document.createElement('div');
          cell.className = 'cell';
          cell.dataset.row = r;
          cell.dataset.col = c;
          
          const cellData = puzzleState[r][c];
          
          if (cellData.type === 'fixed') {
            cell.classList.add('fixed');
            cell.textContent = cellData.value;
          } else {
            const inp = document.createElement('input');
            inp.maxLength = 1;
            
            if (cellData.type === 'solved') {
              inp.value = cellData.value;
              inp.disabled = true;
            }
            
            setupInputEvents(inp, r, c);
            cell.appendChild(inp);
          }
          
          setupCellEvents(cell, r, c);
          sudokuEl.appendChild(cell);
        }
      }
    }

    // Highlight System
    function highlightRelated(row, col) {
      clearHighlights();
      
      const cells = sudokuEl.querySelectorAll('.cell');
      
      cells.forEach((cell, index) => {
        const cellRow = Math.floor(index / 9);
        const cellCol = index % 9;
        const boxRow = Math.floor(cellRow / 3);
        const boxCol = Math.floor(cellCol / 3);
        const targetBoxRow = Math.floor(row / 3);
        const targetBoxCol = Math.floor(col / 3);
        
        if (cellRow === row && cellCol === col) {
          cell.classList.add('selected-cell');
        } else if (cellRow === row) {
          cell.classList.add('highlight-row');
        } else if (cellCol === col) {
          cell.classList.add('highlight-col');
        } else if (boxRow === targetBoxRow && boxCol === targetBoxCol) {
          cell.classList.add('highlight-box');
        }
      });
    }

    function clearHighlights() {
      const cells = sudokuEl.querySelectorAll('.cell');
      cells.forEach(cell => {
        cell.classList.remove('highlight-row', 'highlight-col', 'highlight-box', 'selected-cell', 'hint-cell');
      });
    }

    // Hint System
    function giveHint() {
      if (!window.currentSolution) {
        alert('❌ Tidak ada solusi tersedia!');
        return;
      }

      const emptyCells = [];
      const cells = sudokuEl.querySelectorAll('.cell');
      
      cells.forEach((cell, index) => {
        const input = cell.querySelector('input');
        if (input && !input.disabled) {
          const row = Math.floor(index / 9);
          const col = index % 9;
          emptyCells.push({ cell, input, row, col, index });
        }
      });

      if (emptyCells.length === 0) {
        alert('✅ Puzzle sudah selesai!');
        return;
      }

      // Pick random empty cell
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const solution = window.currentSolution[randomCell.row][randomCell.col];
      
      // Highlight hint cell
      clearHighlights();
      randomCell.cell.classList.add('hint-cell');
      
      // Show hint
      setTimeout(() => {
        randomCell.input.value = solution;
        randomCell.input.disabled = true;
        randomCell.cell.classList.remove('hint-cell');
        randomCell.cell.classList.add('correct-animation');
        
        hintsUsed++;
        correctSound.play();
        
        if (checkWin()) {
          clearInterval(interval);
          setTimeout(() => showWinMessage(), 100);
        }
      }, 1500);

      // Update hint button
      hintBtn.textContent = `💡 Hint (${hintsUsed})`;
      setTimeout(() => {
        hintBtn.textContent = '💡 Hint';
      }, 3000);
    }

    // Difficulty Selection
    function showDifficultyModal() {
      difficultyModal.style.display = 'block';
    }

    function hideDifficultyModal() {
      difficultyModal.style.display = 'none';
    }

    // Enhanced sudoku generation
    function generateFull() {
      const grid = Array.from({length: 9}, () => Array(9).fill(0));
      
      function shuffle(arr) {
        return arr.sort(() => Math.random() - 0.5);
      }
      
      function fill(r, c) {
        if (c === 9) { r++; c = 0; }
        if (r === 9) return true;
        if (grid[r][c] !== 0) return fill(r, c + 1);
        
        let nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (let n of nums) {
          if (isValid(grid, r, c, n)) {
            grid[r][c] = n;
            if (fill(r, c + 1)) return true;
          }
        }
        grid[r][c] = 0;
        return false;
      }
      
      fill(0, 0);
      return grid;
    }

    function makePuzzle(full, cellsToRemove) {
      const puzzle = JSON.parse(JSON.stringify(full));
      let attempts = cellsToRemove;
      
      while (attempts > 0) {
        const r = Math.floor(Math.random() * 9);
        const c = Math.floor(Math.random() * 9);
        
        if (puzzle[r][c] !== 0) {
          puzzle[r][c] = 0;
          attempts--;
        }
      }
      
      return puzzle;
    }

    function isValid(g, r, c, n) {
      for (let i = 0; i < 9; i++) {
        if (g[r][i] === n || g[i][c] === n) return false;
      }
      
      const sr = 3 * Math.floor(r / 3), sc = 3 * Math.floor(c / 3);
      for (let i = sr; i < sr + 3; i++) {
        for (let j = sc; j < sc + 3; j++) {
          if (g[i][j] === n) return false;
        }
      }
      return true;
    }

    // Build library of puzzles for each difficulty
    function buildLibrary() {
      library = { easy: [], medium: [], hard: [], expert: [] };
      
      for (let difficulty in difficultySettings) {
        for (let i = 0; i < 25; i++) {
          const sol = generateFull();
          const cellsToRemove = difficultySettings[difficulty].cellsToRemove;
          library[difficulty].push({
            p: makePuzzle(sol, cellsToRemove),
            s: sol
          });
        }
      }
    }

    function setupInputEvents(inp, r, c) {
      inp.addEventListener('input', () => {
        const v = +inp.value;
        if (v >= 1 && v <= 9) {
          if (v === window.currentSolution[r][c]) {
            inp.disabled = true;
            inp.parentElement.classList.add('correct-animation');
            correctSound.play();
            
            setTimeout(() => {
              inp.parentElement.classList.remove('correct-animation');
            }, 600);
            
            if (checkWin()) {
              clearInterval(interval);
              setTimeout(() => showWinMessage(), 100);
            }
          } else {
            inp.value = '';
            inp.parentElement.classList.add('wrong-animation');
            livesEl.textContent = --lives;
            
            setTimeout(() => {
              inp.parentElement.classList.remove('wrong-animation');
            }, 300);
            
            if (lives <= 0) {
              alert('💔 Yahh Poke! NT yaa!');
              showDifficultyModal();
            }
          }
        } else {
          inp.value = '';
        }
      });

      inp.addEventListener('keydown', (e) => {
        // Allow navigation with arrow keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          navigateWithArrows(r, c, e.key);
        }
      });
    }

    function setupCellEvents(cell, r, c) {
      cell.addEventListener('click', () => {
        selectedCell = { row: r, col: c };
        highlightRelated(r, c);
        
        const input = cell.querySelector('input');
        if (input && !input.disabled) {
          input.focus();
        }
      });
    }

    function navigateWithArrows(currentR, currentC, direction) {
      let newR = currentR, newC = currentC;
      
      switch (direction) {
        case 'ArrowUp': newR = Math.max(0, currentR - 1); break;
        case 'ArrowDown': newR = Math.min(8, currentR + 1); break;
        case 'ArrowLeft': newC = Math.max(0, currentC - 1); break;
        case 'ArrowRight': newC = Math.min(8, currentC + 1); break;
      }
      
      const targetCell = sudokuEl.children[newR * 9 + newC];
      if (targetCell) {
        targetCell.click();
      }
    }

    function checkWin() {
      const inputs = sudokuEl.querySelectorAll('input');
      for (const inp of inputs) {
        if (!inp.disabled) return false;
      }
      return true;
    }

    function showWinMessage() {
      const timeTaken = timer;
      const minutes = Math.floor(timeTaken / 60);
      const seconds = timeTaken % 60;
      const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      
      alert(`🎉 Kelasss brooo! Puzzle-nya akhirnya kelar juga! 🎉\n\n📊 Statistik:\n⏱️ Waktu: ${timeString}\n💡 Hint digunakan: ${hintsUsed}\n🎯 Kesulitan: ${difficultySettings[currentDifficulty].name}`);
    }

    function startGame(difficulty = currentDifficulty) {
      if (!library[difficulty] || library[difficulty].length === 0) {
        alert('⏳ Sedang memuat puzzle...');
        setTimeout(() => startGame(difficulty), 1000);
        return;
      }

      currentDifficulty = difficulty;
      sudokuEl.innerHTML = '';
      lives = 3;
      timer = 0;
      hintsUsed = 0;
      gameStartTime = Date.now();
      
      livesEl.textContent = lives;
      timerEl.textContent = timer;
      difficultyEl.textContent = difficultySettings[difficulty].color + ' ' + difficultySettings[difficulty].name;
      
      clearInterval(interval);
      interval = setInterval(() => {
        timer++;
        timerEl.textContent = timer;
      }, 1000);

      // Pick random puzzle from library
      const { p, s } = library[difficulty][Math.floor(Math.random() * library[difficulty].length)];
      window.currentSolution = s;

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cell = document.createElement('div');
          cell.className = 'cell';
          cell.dataset.row = r;
          cell.dataset.col = c;
          
          if (p[r][c]) {
            cell.classList.add('fixed');
            cell.textContent = p[r][c];
            cell.classList.add('cell-animation');
          } else {
            const inp = document.createElement('input');
            inp.maxLength = 1;
            setupInputEvents(inp, r, c);
            cell.appendChild(inp);
          }
          
          setupCellEvents(cell, r, c);
          sudokuEl.appendChild(cell);
        }
      }

      hideDifficultyModal();
    }

    // Enhanced AI Solver (keeping the existing advanced solver)
    function solveSudokuDFS(grid) {
      const puzzle = grid.map(row => [...row]);
      let solutionSteps = 0;
      
      function isValidPlacement(row, col, num) {
        for (let c = 0; c < 9; c++) {
          if (c !== col && puzzle[row][c] === num) return false;
        }
        
        for (let r = 0; r < 9; r++) {
          if (r !== row && puzzle[r][col] === num) return false;
        }
        
        const boxStartRow = Math.floor(row / 3) * 3;
        const boxStartCol = Math.floor(col / 3) * 3;
        for (let r = boxStartRow; r < boxStartRow + 3; r++) {
          for (let c = boxStartCol; c < boxStartCol + 3; c++) {
            if ((r !== row || c !== col) && puzzle[r][c] === num) return false;
          }
        }
        
        return true;
      }
      
      function findBestEmptyCell() {
        let bestCell = null;
        let minPossibilities = 10;
        
        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 9; col++) {
            if (puzzle[row][col] === 0) {
              const possibilities = getPossibleNumbers(row, col);
              
              if (possibilities.length === 0) {
                return { cell: null, possibilities: [] };
              }
              
              if (possibilities.length < minPossibilities) {
                minPossibilities = possibilities.length;
                bestCell = [row, col];
                
                if (minPossibilities === 1) {
                  return { cell: bestCell, possibilities };
                }
              }
            }
          }
        }
        
        return { 
          cell: bestCell, 
          possibilities: bestCell ? getPossibleNumbers(bestCell[0], bestCell[1]) : [] 
        };
      }
      
      function getPossibleNumbers(row, col) {
        const possible = [];
        for (let num = 1; num <= 9; num++) {
          if (isValidPlacement(row, col, num)) {
            possible.push(num);
          }
        }
        return possible;
      }
      
      function solveDFS() {
        solutionSteps++;
        
        if (solutionSteps > 100000) {
          return false;
        }
        
        const { cell, possibilities } = findBestEmptyCell();
        
        if (!cell) {
          return true;
        }
        
        if (possibilities.length === 0) {
          return false;
        }
        
        const [row, col] = cell;
        
        for (let num of possibilities) {
          puzzle[row][col] = num;
          
          if (solveDFS()) {
            return true;
          }
          
          puzzle[row][col] = 0;
        }
        
        return false;
      }
      
      const solved = solveDFS();
      return solved ? puzzle : null;
    }

    // Event Listeners
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      themeBtn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
    });

    refreshBtn.addEventListener('click', () => {
      if (confirm('🔄 Mulai puzzle baru?\n\nProgress saat ini akan hilang!')) {
        showDifficultyModal();
      }
    });

    saveBtn.addEventListener('click', saveGame);
    loadBtn.addEventListener('click', loadGame);
    hintBtn.addEventListener('click', giveHint);

    // Difficulty modal events
    difficultyModal.addEventListener('click', (e) => {
      if (e.target === difficultyModal) {
        // Don't allow closing by clicking outside on first load
        if (sudokuEl.children.length > 0) {
          hideDifficultyModal();
        }
      }
      
      if (e.target.classList.contains('difficulty-btn')) {
        const level = e.target.dataset.level;
        startGame(level);
      }
    });

    solveBtn.addEventListener('click', () => {
      clearInterval(interval);
      
      const currentGrid = Array.from({length: 9}, () => Array(9).fill(0));
      const cells = document.querySelectorAll('#sudoku .cell');
      let emptyCount = 0;
      
      cells.forEach((cell, index) => {
        const row = Math.floor(index / 9);
        const col = index % 9;
        
        if (cell.classList.contains('fixed')) {
          const value = parseInt(cell.textContent);
          currentGrid[row][col] = value;
        } else {
          const input = cell.querySelector('input');
          if (input && input.disabled && input.value) {
            const value = parseInt(input.value);
            currentGrid[row][col] = value;
          } else if (input && !input.disabled) {
            emptyCount++;
          }
        }
      });
      
      if (emptyCount === 0) {
        alert('✅ Puzzle sudah selesai!');
        return;
      }
      
      const solvedGrid = solveSudokuDFS(currentGrid);
      
      if (solvedGrid) {
        let filledCells = 0;
        cells.forEach((cell, index) => {
          const row = Math.floor(index / 9);
          const col = index % 9;
          const input = cell.querySelector('input');
          
          if (input && !input.disabled) {
            const solution = solvedGrid[row][col];
            input.value = solution;
            input.disabled = true;
            cell.classList.add('cell-animation');
            filledCells++;
          }
        });
        
        setTimeout(() => alert(`🤖 Done Kawann!!\n\n📊 Statistik:\n• Sel diisi AI: ${filledCells}\n• Algoritma: DFS dengan MRV\n• Solusi 100% valid! 🧠`), 500);
      } else {
        alert('❌ AI tidak dapat menyelesaikan puzzle ini!\nKemungkinan ada kesalahan dalam jawaban yang sudah diisi.');
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            saveGame();
            break;
          case 'l':
            e.preventDefault();
            loadGame();
            break;
          case 'h':
            e.preventDefault();
            giveHint();
            break;
          case 'r':
            e.preventDefault();
            if (confirm('🔄 Mulai puzzle baru?')) {
              showDifficultyModal();
            }
            break;
        }
      }
    });

    // Click outside to clear highlights
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#sudoku')) {
        clearHighlights();
        selectedCell = null;
      }
    });

    // Initialize
    window.onload = () => {
      console.log('🎮 Membangun library puzzle...');
      buildLibrary();
      console.log('✅ Library siap!');
      
      // Check for saved game
      const savedGame = localStorage.getItem('sudoku_save');
      if (savedGame) {
        if (confirm('📁 Ditemukan game tersimpan!\nMau lanjut atau mulai baru?')) {
          loadGame();
        } else {
          showDifficultyModal();
        }
      } else {
        showDifficultyModal();
      }
    };