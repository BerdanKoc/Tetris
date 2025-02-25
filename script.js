// Configuration initiale du jeu
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const EMPTY_CELL = 0;

// Définition des tetrominos
const TETROMINOS = {
    I: {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: '#00f0f0'
    },
    J: {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#0000f0'
    },
    L: {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#f0a000'
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#f0f000'
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#00f000'
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#a000f0'
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: '#f00000'
    }
};

// Ajout des nouvelles constantes
const EASY_PIECES = ['I', 'O']; // Pièces faciles (ligne et carré)
const SPECIAL_PIECE = {
    name: 'HEART',
    shape: [
        [0, 1, 0, 1, 0],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0]
    ],
    color: '#ff69b4'
};

// Au début du fichier, après les constantes
const HIGH_SCORES_KEY = 'tetrisHighScores';

// Classe principale du jeu
class TetrisGame {
    constructor(isAI = false) {
        this.grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(EMPTY_CELL));
        this.score = 0;
        this.isAI = isAI;
        this.gameOver = false;
        this.currentPiece = null;
        this.currentPosition = { x: 0, y: 0 };
        this.gridElement = document.querySelector(isAI ? '.ai-grid' : '.player-grid');
        this.nextPiece = null;
        this.nextPieceDisplay = document.querySelector(isAI ? '.ai-next-piece' : '.next-piece-display');
        this.opponent = null; // Référence à l'adversaire
        this.normalSpeed = 1000; // Vitesse normale de chute
        this.currentSpeed = this.normalSpeed;
        this.lastSpeedChange = 0;
        this.isPaused = false;
        
        // Supprimons les autres sons et gardons uniquement la musique
        if (!isAI) {
            this.backgroundMusic = document.getElementById('background-music');
            if (this.backgroundMusic instanceof HTMLAudioElement) {
                this.backgroundMusic.volume = 0.5;
            }
        }

        this.bonusButtons = {
            clearColumn: document.getElementById('clear-column'),
            slowTime: document.getElementById('slow-time'),
            easyPiece: document.getElementById('easy-piece')
        };
        
        if (!isAI) {
            this.initBonusButtons();
        }
    }

    initBonusButtons() {
        // Clear Column Bonus
        this.bonusButtons.clearColumn?.addEventListener('click', () => {
            if (this.score >= 300) {
                this.score -= 300;
                this.clearRandomColumn();
                this.updateScore();
            }
        });

        // Slow Time Bonus
        this.bonusButtons.slowTime?.addEventListener('click', () => {
            if (this.score >= 0) {
                this.score -= 0;
                this.slowDownOpponent();
                this.updateScore();
            }
        });

        // Easy Piece Bonus
        this.bonusButtons.easyPiece?.addEventListener('click', () => {
            if (this.score >= 200) {
                this.score -= 200;
                this.giveEasyPiece();
                this.updateScore();
            }
        });
    }

    updateScore() {
        const scoreElement = document.querySelector(this.isAI ? '#ai-score' : '#player-score');
        if (scoreElement) {
            scoreElement.textContent = this.score.toString();
        }
        
        // Mettre à jour l'état des boutons bonus
        if (!this.isAI) {
            if (this.bonusButtons.clearColumn instanceof HTMLButtonElement) {
                this.bonusButtons.clearColumn.disabled = this.score < 500;
            }
            if (this.bonusButtons.slowTime instanceof HTMLButtonElement) {
                this.bonusButtons.slowTime.disabled = this.score < 300;
            }
            if (this.bonusButtons.easyPiece instanceof HTMLButtonElement) {
                this.bonusButtons.easyPiece.disabled = this.score < 200;
            }
        }
    }

    clearRandomColumn() {
        const column = Math.floor(Math.random() * GRID_WIDTH);
        for (let y = 0; y < GRID_HEIGHT; y++) {
            this.grid[y][column] = EMPTY_CELL;
        }
        this.draw();
    }

    slowDownOpponent() {
        if (this.opponent) {
            const originalSpeed = this.opponent.currentSpeed;
            this.opponent.currentSpeed *= 2; // Ralentit de 50%
            setTimeout(() => {
                this.opponent.currentSpeed = originalSpeed;
            }, 10000); // Dure 10 secondes
        }
    }

    // Génère une nouvelle pièce aléatoire
    generateNewPiece() {
        if (this.nextPiece === null) {
            const pieces = Object.keys(TETROMINOS);
            const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
            return {
                ...TETROMINOS[randomPiece],
                name: randomPiece
            };
        }
        const currentPiece = this.nextPiece;
        const pieces = Object.keys(TETROMINOS);
        const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
        this.nextPiece = {
            ...TETROMINOS[randomPiece],
            name: randomPiece
        };
        this.drawNextPiece();
        return currentPiece;
    }

    // Initialise la grille visuelle
    createGrid() {
        if (!this.gridElement) return;
        
        this.gridElement.innerHTML = '';
        for (let i = 0; i < GRID_HEIGHT; i++) {
            for (let j = 0; j < GRID_WIDTH; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = i.toString();
                cell.dataset.col = j.toString();
                this.gridElement.appendChild(cell);
            }
        }
    }

    // Méthode d'initialisation
    init() {
        this.createGrid();
        this.nextPiece = this.generateNewPiece();
        this.currentPiece = this.generateNewPiece();
        this.currentPosition = {
            x: Math.floor(GRID_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2),
            y: 0
        };
        this.draw();

        // Démarrer la musique pour le joueur
        if (!this.isAI && this.backgroundMusic instanceof HTMLAudioElement) {
            this.backgroundMusic.play().catch(() => {
                console.log('La lecture automatique de la musique a été bloquée');
            });
        }
    }

    // Dessine la pièce courante sur la grille
    draw() {
        if (!this.gridElement) return;
        
        const cells = this.gridElement.getElementsByClassName('cell');
        
        // Dessine d'abord la grille fixe
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const index = y * GRID_WIDTH + x;
                if (cells[index] instanceof HTMLElement) {
                    cells[index].style.backgroundColor = this.grid[y][x] || '';
                }
            }
        }

        // Dessine ensuite la pièce courante
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const actualX = this.currentPosition.x + x;
                    const actualY = this.currentPosition.y + y;
                    if (actualY >= 0 && actualY < GRID_HEIGHT && actualX >= 0 && actualX < GRID_WIDTH) {
                        const index = actualY * GRID_WIDTH + actualX;
                        if (cells[index] instanceof HTMLElement) {
                            cells[index].style.backgroundColor = this.currentPiece.color;
                        }
                    }
                }
            });
        });
    }

    // Dessine la prochaine pièce
    drawNextPiece() {
        if (!this.nextPieceDisplay || !this.nextPiece) return;
        
        this.nextPieceDisplay.innerHTML = '';
        const size = 20;
        
        this.nextPiece?.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value && this.nextPieceDisplay) {
                    const cell = document.createElement('div');
                    cell.style.position = 'absolute';
                    cell.style.width = size + 'px';
                    cell.style.height = size + 'px';
                    cell.style.backgroundColor = this.nextPiece.color;
                    cell.style.left = (x * size) + 'px';
                    cell.style.top = (y * size) + 'px';
                    this.nextPieceDisplay.appendChild(cell);
                }
            });
        });
    }

    // Méthodes de mouvement
    moveLeft() {
        this.currentPosition.x--;
        if (this.hasCollision()) {
            this.currentPosition.x++;
        }
        this.draw();
    }

    moveRight() {
        this.currentPosition.x++;
        if (this.hasCollision()) {
            this.currentPosition.x--;
        }
        this.draw();
    }

    moveDown() {
        this.currentPosition.y++;
        if (this.hasCollision()) {
            this.currentPosition.y--;
            this.lockPiece();
            return false;
        }
        this.draw();
        return true;
    }

    rotate() {
        const originalShape = this.currentPiece.shape;
        this.currentPiece.shape = this.currentPiece.shape[0].map((_, i) =>
            this.currentPiece.shape.map(row => row[i]).reverse()
        );
        
        if (this.hasCollision()) {
            this.currentPiece.shape = originalShape;
        }
        this.draw();
    }

    // Vérifie les collisions
    hasCollision() {
        return this.currentPiece.shape.some((row, y) => {
            return row.some((value, x) => {
                if (!value) return false;
                const actualX = this.currentPosition.x + x;
                const actualY = this.currentPosition.y + y;
                
                return (
                    actualX < 0 || 
                    actualX >= GRID_WIDTH ||
                    actualY >= GRID_HEIGHT ||
                    (actualY >= 0 && this.grid[actualY][actualX])
                );
            });
        });
    }

    // Verrouille la pièce en place
    lockPiece() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const actualY = y + this.currentPosition.y;
                    const actualX = x + this.currentPosition.x;
                    if (actualY >= 0) {
                        this.grid[actualY][actualX] = this.currentPiece.color;
                    }
                }
            });
        });
        
        this.checkLines();
        this.currentPiece = this.generateNewPiece();
        this.currentPosition = {
            x: Math.floor(GRID_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2),
            y: 0
        };

        if (this.hasCollision()) {
            this.gameOver = true;
            
            if (!this.isAI) {
                this.updateHighScores();
            }
            
            // Afficher le message approprié
            if (this.isAI) {
                alert("Game Over - L'IA a perdu! Le joueur gagne!");
            } else {
                alert("Game Over - Le joueur a perdu! L'IA gagne!");
            }
            
            // Réinitialiser les deux jeux après le clic sur OK
            this.grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(EMPTY_CELL));
            this.opponent.grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(EMPTY_CELL));
            
            this.score = 0;
            this.opponent.score = 0;
            
            // Réinitialiser les pièces
            this.nextPiece = this.generateNewPiece();
            this.opponent.nextPiece = this.opponent.generateNewPiece();
            this.currentPiece = this.generateNewPiece();
            this.opponent.currentPiece = this.opponent.generateNewPiece();
            
            // Réinitialiser les positions
            this.currentPosition = {
                x: Math.floor(GRID_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2),
                y: 0
            };
            this.opponent.currentPosition = {
                x: Math.floor(GRID_WIDTH / 2) - Math.floor(this.opponent.currentPiece.shape[0].length / 2),
                y: 0
            };
            
            // Réinitialiser les états
            this.gameOver = false;
            this.opponent.gameOver = false;
            
            // Mettre à jour les scores affichés
            const playerScoreElement = document.querySelector('#player-score');
            const aiScoreElement = document.querySelector('#ai-score');
            if (playerScoreElement) playerScoreElement.textContent = '0';
            if (aiScoreElement) aiScoreElement.textContent = '0';
            
            // Redessiner les grilles
            this.draw();
            this.opponent.draw();
            this.drawNextPiece();
            this.opponent.drawNextPiece();
        }
    }

    // Nouvelle méthode pour gérer le cadeau surprise
    giveEasyPiece() {
        const easyPiece = EASY_PIECES[Math.floor(Math.random() * EASY_PIECES.length)];
        this.nextPiece = {
            ...TETROMINOS[easyPiece],
            name: easyPiece
        };
        this.drawNextPiece();
    }

    // Nouvelle méthode pour la pause douceur
    checkSpeedBonus() {
        if (this.score >= 1000 && Date.now() - this.lastSpeedChange > 10000) {
            this.currentSpeed = this.normalSpeed * 1.2;
            setTimeout(() => {
                this.currentSpeed = this.normalSpeed;
            }, 10000);
            this.lastSpeedChange = Date.now();
        }
    }

    // Modification de checkLines pour inclure les règles spéciales
    checkLines() {
        let linesCleared = [];
        let points = 0;
        
        for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== EMPTY_CELL)) {
                linesCleared.push(y);
            }
        }

        if (linesCleared.length > 0) {
            // Effet visuel
            this.flashLines(linesCleared);
            
            // Supprime les lignes
            linesCleared.forEach(y => {
                this.grid.splice(y, 1);
                this.grid.unshift(Array(GRID_WIDTH).fill(EMPTY_CELL));
            });

            // Calcul du score avec bonus
            switch (linesCleared.length) {
                case 1: points = 50; break;
                case 2: points = 150; break;
                case 3: points = 250; break;
                case 4: points = 350; break;
            }
            
            this.score += points;
            this.updateScore(); // Mettre à jour le score et les boutons bonus
        }

        // Règles spéciales
        if (linesCleared.length === 2 && this.opponent) {
            this.opponent.giveEasyPiece();
        }
        
        if (linesCleared.length === 4 && this.opponent) {
            this.exchangeLines();
        }

        this.checkSpeedBonus();
    }

    // Nouvelle méthode pour l'échange de lignes
    exchangeLines() {
        const myFullLine = this.grid.findIndex(line => 
            line.every(cell => cell !== EMPTY_CELL));
        
        const opponentEmptyLine = this.opponent.grid.findIndex(line => 
            line.every(cell => cell === EMPTY_CELL));

        if (myFullLine !== -1 && opponentEmptyLine !== -1) {
            const temp = [...this.grid[myFullLine]];
            this.grid[myFullLine] = [...this.opponent.grid[opponentEmptyLine]];
            this.opponent.grid[opponentEmptyLine] = temp;
            
            this.draw();
            this.opponent.draw();
        }
    }

    // Nouvelles méthodes pour l'IA
    evaluatePosition() {
        let score = 0;
        
        // Poids ajustés pour une meilleure stratégie
        const weights = {
            holes: -8,         // Pénalité plus forte pour les trous
            height: -2,        // Pénalité modérée pour la hauteur
            complete: 15,      // Bonus plus important pour les lignes complètes
            smoothness: 2,     // Bonus pour une surface régulière
            blockades: -4,     // Pénalité pour les blocs au-dessus des trous
            centerBonus: 3,    // Bonus pour utiliser le centre
            wellBonus: 2       // Bonus pour créer des "puits" pour les I
        };

        // Calcule la hauteur de chaque colonne
        const heights = new Array(GRID_WIDTH).fill(0);
        for (let x = 0; x < GRID_WIDTH; x++) {
            for (let y = 0; y < GRID_HEIGHT; y++) {
                if (this.grid[y][x] !== EMPTY_CELL) {
                    heights[x] = GRID_HEIGHT - y;
                    break;
                }
            }
        }

        // Pénalise les trous et les blockades
        let holes = 0;
        let blockades = 0;
        for (let x = 0; x < GRID_WIDTH; x++) {
            let hasBlock = false;
            let columnHoles = 0;
            for (let y = 0; y < GRID_HEIGHT; y++) {
                if (this.grid[y][x] !== EMPTY_CELL) {
                    hasBlock = true;
                    blockades += columnHoles; // Compte les blocs au-dessus des trous
                } else if (hasBlock) {
                    holes++;
                    columnHoles++;
                }
            }
        }

        // Calcule la régularité (différence de hauteur entre colonnes adjacentes)
        let smoothness = 0;
        for (let x = 0; x < GRID_WIDTH - 1; x++) {
            smoothness -= Math.abs(heights[x] - heights[x + 1]);
        }

        // Bonus pour l'utilisation du centre
        let centerBonus = 0;
        const center = Math.floor(GRID_WIDTH / 2);
        for (let x = center - 1; x <= center + 1; x++) {
            centerBonus += heights[x];
        }

        // Compte les lignes complètes
        let completeLines = 0;
        for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== EMPTY_CELL)) {
                completeLines++;
            }
        }

        // Calcul du score final
        score += holes * weights.holes;
        score += Math.max(...heights) * weights.height;
        score += completeLines * weights.complete;
        score += smoothness * weights.smoothness;
        score += blockades * weights.blockades;
        score += centerBonus * weights.centerBonus;

        // Ajoute un bonus pour les "puits" (colonnes vides entourées de blocs)
        let wellBonus = 0;
        for (let x = 0; x < GRID_WIDTH; x++) {
            let isWell = true;
            let wellDepth = 0;
            
            for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
                if (this.grid[y][x] === EMPTY_CELL) {
                    if ((x === 0 || this.grid[y][x-1] !== EMPTY_CELL) && 
                        (x === GRID_WIDTH-1 || this.grid[y][x+1] !== EMPTY_CELL)) {
                        wellDepth++;
                    } else {
                        isWell = false;
                        break;
                    }
                } else {
                    break;
                }
            }
            if (isWell && wellDepth > 0) {
                wellBonus += wellDepth * weights.wellBonus;
            }
        }

        score += wellBonus;

        return score;
    }

    findBestMove() {
        if (!this.isAI) return null;

        let bestScore = -Infinity;
        let bestMove = { x: 0, rotations: 0 };
        const originalShape = this.currentPiece.shape;
        const originalPos = { ...this.currentPosition };
        const originalGrid = this.grid.map(row => [...row]);

        // Pour chaque rotation possible
        for (let rot = 0; rot < 4; rot++) {
            // Pour chaque position horizontale
            for (let x = -2; x < GRID_WIDTH + 2; x++) {
                this.currentPosition.x = x;
                this.currentPosition.y = 0;

                if (!this.hasCollision()) {
                    // Simule la chute de la pièce
                    while (!this.hasCollision()) {
                        this.currentPosition.y++;
                    }
                    this.currentPosition.y--;

                    // Simule le placement de la pièce
                    this.currentPiece.shape.forEach((row, dy) => {
                        row.forEach((value, dx) => {
                            if (value) {
                                const actualX = this.currentPosition.x + dx;
                                const actualY = this.currentPosition.y + dy;
                                if (actualY >= 0 && actualY < GRID_HEIGHT && actualX >= 0 && actualX < GRID_WIDTH) {
                                    this.grid[actualY][actualX] = this.currentPiece.color;
                                }
                            }
                        });
                    });

                    // Évalue la position
                    const score = this.evaluatePosition();
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { x: x, rotations: rot };
                    }

                    // Restaure la grille
                    this.grid = originalGrid.map(row => [...row]);
                }
            }

            // Rotation pour le prochain essai
            this.currentPiece.shape = this.currentPiece.shape[0].map((_, i) =>
                this.currentPiece.shape.map(row => row[i]).reverse()
            );
        }

        // Restaure l'état original
        this.currentPiece.shape = originalShape;
        this.currentPosition = { ...originalPos };
        this.grid = originalGrid.map(row => [...row]);

        return bestMove;
    }

    makeAIMove() {
        if (!this.isAI || this.gameOver) return;

        const bestMove = this.findBestMove();
        if (!bestMove) {
            this.moveDown();  // Si pas de meilleur coup trouvé, on descend simplement
            return;
        }
        
        // Limite le nombre de rotations
        const maxRotations = Math.min(bestMove.rotations, 4);
        for (let i = 0; i < maxRotations; i++) {
            this.rotate();
        }

        // Limite les déplacements horizontaux
        const maxMoves = 10;  // Nombre maximum de mouvements horizontaux
        let moves = 0;
        
        while (this.currentPosition.x < bestMove.x && moves < maxMoves) {
            this.moveRight();
            moves++;
        }
        while (this.currentPosition.x > bestMove.x && moves < maxMoves) {
            this.moveLeft();
            moves++;
        }

        // Un seul moveDown à la fois
        this.moveDown();
    }

    // Ajoutons une nouvelle méthode resetGame
    resetGame() {
        this.grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(EMPTY_CELL));
        this.score = 0;
        this.gameOver = false;
        this.currentSpeed = this.normalSpeed;
        this.lastSpeedChange = 0;
        
        // Mise à jour du score affiché
        const scoreElement = document.querySelector(this.isAI ? '#ai-score' : '#player-score');
        if (scoreElement) {
            scoreElement.textContent = '0';
        }
        
        // Réinitialisation des pièces
        this.nextPiece = this.generateNewPiece();
        this.currentPiece = this.generateNewPiece();
        this.currentPosition = {
            x: Math.floor(GRID_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2),
            y: 0
        };
        
        this.draw();
        this.drawNextPiece();

        // Redémarrer la musique si elle était arrêtée
        if (!this.isAI && this.backgroundMusic instanceof HTMLAudioElement) {
            this.backgroundMusic.currentTime = 0;
            this.backgroundMusic.play().catch(() => {});
        }
    }

    // Effet de flash pour les lignes complétées
    flashLines(lines) {
        if (!this.gridElement) return;
        
        const cells = this.gridElement.getElementsByClassName('cell');
        lines.forEach(y => {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const index = y * GRID_WIDTH + x;
                const cell = cells[index];
                if (cell instanceof HTMLElement) {
                    cell.style.transition = 'background-color 0.1s';
                    cell.style.backgroundColor = '#fff';
                    setTimeout(() => {
                        cell.style.backgroundColor = '';
                    }, 50);
                }
            }
        });
    }

    updateHighScores() {
        if (this.isAI) return; // On ne sauvegarde que les scores du joueur
        
        // Récupère les scores existants ou crée un tableau vide
        let highScores = JSON.parse(localStorage.getItem(HIGH_SCORES_KEY) || '[]');
        
        // Ajoute le nouveau score
        const playerName = prompt('Entrez votre nom :', 'Joueur');
        if (playerName) {
            highScores.push({
                name: playerName,
                score: this.score
            });
            
            // Trie les scores par ordre décroissant
            highScores.sort((a, b) => b.score - a.score);
            
            // Garde uniquement les 5 meilleurs scores
            highScores = highScores.slice(0, 5);
            
            // Sauvegarde dans le localStorage
            localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(highScores));
            
            // Met à jour l'affichage
            this.displayHighScores();
        }
    }

    displayHighScores() {
        const scoresBody = document.getElementById('scores-body');
        if (!scoresBody) return;
        
        const highScores = JSON.parse(localStorage.getItem(HIGH_SCORES_KEY) || '[]');
        
        scoresBody.innerHTML = highScores.map((score, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${score.name}</td>
                <td>${score.score}</td>
            </tr>
        `).join('');
    }
}

// Ajout des contrôles clavier (en dehors de la classe)
document.addEventListener('keydown', (event) => {
    if (!playerGame.gameOver) {
        switch (event.key) {
            case 'ArrowLeft':
                playerGame.moveLeft();
                break;
            case 'ArrowRight':
                playerGame.moveRight();
                break;
            case 'ArrowDown':
                playerGame.moveDown();
                break;
            case 'ArrowUp':
                playerGame.rotate();
                break;
        }
    }
});

// Modification de l'initialisation pour rendre playerGame accessible globalement
let playerGame;
let aiGame;

document.addEventListener('DOMContentLoaded', () => {
    playerGame = new TetrisGame(false);
    aiGame = new TetrisGame(true);
    
    // Lier les adversaires
    playerGame.opponent = aiGame;
    aiGame.opponent = playerGame;
    
    playerGame.isPaused = true;
    aiGame.isPaused = true;

    // Gestion de l'écran de démarrage
    const startScreen = document.getElementById('start-screen');
    const startButton = document.getElementById('start-game');
    const pauseMenu = document.getElementById('pause-menu');

    startButton?.addEventListener('click', () => {
        if (startScreen) {
            startScreen.style.display = 'none';
        }
        playerGame.isPaused = false;
        aiGame.isPaused = false;
        playerGame.init();
        aiGame.init();
        gameLoop();
    });

    // Gestion du menu pause
    const resumeButton = document.getElementById('resume-game');
    const restartButton = document.getElementById('restart-game');

    resumeButton?.addEventListener('click', () => {
        playerGame.isPaused = false;
        aiGame.isPaused = false;
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
    });

    restartButton?.addEventListener('click', () => {
        playerGame.resetGame();
        aiGame.resetGame();
        playerGame.isPaused = false;
        aiGame.isPaused = false;
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
    });

    // Modifier le gameLoop pour prendre en compte la pause
    const gameLoop = () => {
        if (!playerGame.isPaused) {
            if (!playerGame.gameOver) {
                playerGame.moveDown();
            }
            if (!aiGame.gameOver) {
                aiGame.makeAIMove();
            }
        }
        setTimeout(gameLoop, Math.min(playerGame.currentSpeed, aiGame.currentSpeed));
    };
    
    gameLoop();

    // Effet arc-en-ciel
    setInterval(() => {
        const duration = 20000; // 20 secondes
        const originalColors = { ...TETROMINOS };
        
        // Changement des couleurs
        Object.keys(TETROMINOS).forEach(piece => {
            TETROMINOS[piece].color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        });
        
        // Retour aux couleurs originales
        setTimeout(() => {
            Object.keys(TETROMINOS).forEach(piece => {
                TETROMINOS[piece].color = originalColors[piece].color;
            });
        }, duration);
    }, 120000); // Toutes les 2 minutes

    // Ajoutons des animations CSS pour les pièces
    const style = document.createElement('style');
    style.textContent = `
        .cell {
            transition: background-color 0.1s;
        }
        
        .flash {
            animation: flash 0.2s;
        }
        
        @keyframes flash {
            0% { filter: brightness(1); }
            50% { filter: brightness(2); }
            100% { filter: brightness(1); }
        }
        
        .piece-drop {
            animation: dropAnimation 0.2s;
        }
        
        @keyframes dropAnimation {
            0% { transform: translateY(-20px); }
            100% { transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    // À la fin du DOMContentLoaded
    document.getElementById('toggle-music')?.addEventListener('click', () => {
        const music = document.getElementById('background-music');
        const button = document.getElementById('toggle-music');
        if (music instanceof HTMLAudioElement && button) {
            if (music.paused) {
                music.play();
                button.textContent = '🔊 Musique';
            } else {
                music.pause();
                button.textContent = '🔈 Musique';
            }
        }
    });

    playerGame.displayHighScores();

    // Gestion du bouton pause
    const pauseButton = document.getElementById('pause-button');
    pauseButton?.addEventListener('click', () => {
        togglePause();
    });

    // Fonction pour gérer la pause
    function togglePause() {
        playerGame.isPaused = !playerGame.isPaused;
        aiGame.isPaused = !aiGame.isPaused;
        
        // Mettre à jour le bouton pause
        if (pauseButton) {
            pauseButton.textContent = playerGame.isPaused ? '▶️ Reprendre' : '⏸️ Pause';
        }
        
        // Afficher/cacher le menu pause
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = playerGame.isPaused ? 'flex' : 'none';
        }
    }

    // Modifier le gestionnaire de la touche espace
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space' && !playerGame.gameOver) {
            togglePause();
        }
    });
}); 