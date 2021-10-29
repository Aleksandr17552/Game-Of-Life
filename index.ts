class GameLifeCore {
    private timer: number;
    private grid: any[];
    private nextGrid: any[];
    private playing: boolean;

    constructor(private settings: GameLifeCoreSettings, private renderer: GameLifeRenderer) {
        this.timer = null;
        this.grid = [];
        this.nextGrid = [];
        this.playing = false;

        this.resetGrid()
        this.createTable();
        this.createListeners();
    }


    private createTable(): void {
        const { rows, cols } = this.settings;
        this.renderer.createTable({ rows, cols });
    }


    private createListeners(): void {
        this.renderer.onTableClicked((options) => this.getNextCellStatus(options));
        this.renderer.onStartClicked(() => this.start());
        this.renderer.onResetClicked(() => this.reset());
    }


    public start(): void {
        this.playing = !this.playing;

        if (this.playing) {
            this.renderer.setStartBtnText('Pause');
            this.timer = setInterval(() => this.computeNextGen(), this.settings.tickMS);
        } else {
            this.renderer.setStartBtnText('Continue');
            clearInterval(this.timer);
        }
    }


    public reset(): void {
        this.playing = false;
        clearInterval(this.timer);
        this.resetGrid()
        this.renderer.setStartBtnText('Start');
        this.renderer.resetTableView()
    }


    public stop() {
        this.renderer.destroy();
    }


    public getNextCellStatus({ row, col, isLive }): boolean {
        const nextStatus = !isLive;
        this.grid[row][col] = Number(nextStatus);
        return nextStatus;
    }


    private resetGrid(): void {
        const { rows, cols } = this.settings;
        this.grid = new Array(rows);
        this.nextGrid = new Array(rows);
        for (let i = 0; i < rows; i++) {
            this.grid[i] = new Array(cols);
            this.nextGrid[i] = new Array(cols);
            for (let j = 0; j < cols; j++) {
                this.grid[i][j] = 0;
                this.nextGrid[i][j] = 0;
            }
        }
    }


    private computeNextGen(): void {
        const { grid } = this;
        const { rows, cols } = this.settings;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                this.applyRules(i, j);
            }
        }

        this.updateGrid();
        this.renderer.updateView(grid, rows, cols);
    }

    private updateGrid(): void {
        const {rows, cols} = this.settings;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                this.grid[i][j] = this.nextGrid[i][j];
                this.nextGrid[i][j] = 0;
            }
        }
    }

    private applyRules(row, col): void {
        const { grid } = this;
        const numNeighbors = this.countNeighbors(row, col);
        if (grid[row][col] == 1) {
            if (numNeighbors < 2) {
                this.nextGrid[row][col] = 0;
            } else if (numNeighbors == 2 || numNeighbors == 3) {
                this.nextGrid[row][col] = 1;
            } else if (numNeighbors > 3) {
                this.nextGrid[row][col] = 0;
            }
        } else if (grid[row][col] == 0) {
            if (numNeighbors == 3) {
                this.nextGrid[row][col] = 1;
            }
        }
    }

    private countNeighbors(row, col): number {
        const { grid } = this;
        const { rows, cols } = this.settings;
        let count = 0;
        if (row-1 >= 0) {
            if (grid[row-1][col] == 1) count++;
        }
        if (row-1 >= 0 && col-1 >= 0) {
            if (grid[row-1][col-1] == 1) count++;
        }
        if (row-1 >= 0 && col+1 < cols) {
            if (grid[row-1][col+1] == 1) count++;
        }
        if (col-1 >= 0) {
            if (grid[row][col-1] == 1) count++;
        }
        if (col+1 < cols) {
            if (grid[row][col+1] == 1) count++;
        }
        if (row+1 < rows) {
            if (grid[row+1][col] == 1) count++;
        }
        if (row+1 < rows && col-1 >= 0) {
            if (grid[row+1][col-1] == 1) count++;
        }
        if (row+1 < rows && col+1 < cols) {
            if (grid[row+1][col+1] == 1) count++;
        }
        return count;
    }
}


class GameLifeRenderer {
    private table: Element;
    private startCb: () => void;
    private resetCb: () => void;
    private getNextCellStatus: (options) => boolean;

    constructor(private settings: GameLifeRendererSettings) {
        this.eventListenerCell = this.eventListenerCell.bind(this);
    }


    public createTable(options: { cols: number, rows: number }): void {
        const { cols, rows } = options;
        const gridContainer = document.getElementById(this.settings.fieldContainerId);
        this.table = document.createElement("table");

        for (let i = 0; i < rows; i++) {
            const tr = document.createElement("tr");
            for (let j = 0; j < cols; j++) {
                const cell = document.createElement("td");
                cell.setAttribute("id", i + "_" + j);
                cell.setAttribute("class", "dead");
                tr.appendChild(cell);
            }
            this.table.appendChild(tr);
        }
        gridContainer.appendChild(this.table);
    }


    private eventListenerCell({ target }): void {
        const [row, col] = target.getAttribute("id").split("_");
        const classes = target.getAttribute("class");
        const isLive = classes === 'live';
        const nextStatus = this.getNextCellStatus({ row, col, isLive });
        this.toggleClass(target, nextStatus);
    }

    private toggleClass(target, isLive: boolean): void {
        const cellClass = isLive ? "live" : "dead";
        target.setAttribute("class", cellClass);
    }


    public onTableClicked(cb): void {
        this.getNextCellStatus = cb;
        this.table.addEventListener('click', this.eventListenerCell);
    }

    public onStartClicked(cb: () => void): void {
        this.startCb = cb;
        document.getElementById(this.settings.startControlId).addEventListener('click', cb);
    }

    public onResetClicked(cb: () => void): void {
        this.resetCb = cb;
        document.getElementById(this.settings.resetControlId).addEventListener('click', cb);
    }

    public setStartBtnText(text: string): void {
        document.getElementById(this.settings.startControlId).innerHTML = text;
    }

    public resetTableView(): void {
        const cells = document.querySelectorAll(".live");
        for (let cell of cells) {
            cell.setAttribute("class", "dead");
        }
    }

    public updateView(grid, rows, cols): void {
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const cell = document.getElementById(i + "_" + j);
                if (grid[i][j] == 0) {
                    cell.setAttribute("class", "dead");
                } else {
                    cell.setAttribute("class", "live");
                }
            }
        }
    }

    public destroy(): void {
        this.table.removeEventListener('click', this.eventListenerCell);
        document.getElementById(this.settings.startControlId).removeEventListener('click', this.startCb);
        document.getElementById(this.settings.resetControlId).removeEventListener('click', this.resetCb);
    }
}


interface GameLifeCoreSettings {
    rows: number;
    cols: number;
    tickMS: number;
}


interface GameLifeRendererSettings {
    fieldContainerId: string;
    startControlId: string;
    resetControlId: string;
}


interface GameLifeSettings {
    renderer: GameLifeRendererSettings;
    core: GameLifeCoreSettings;
}


const settings: GameLifeSettings = {
    renderer: {
        fieldContainerId: 'gridContainer',
        startControlId: 'btnStart',
        resetControlId: 'btnReset',
    },
    core: {
        rows: 50,
        cols: 70,
        tickMS: 100,
    }
};


class GameLife {
    constructor(settings: GameLifeSettings) {
        const gameRenderer = new GameLifeRenderer(settings.renderer)
        new GameLifeCore(settings.core, gameRenderer);
    }
}


const game = new GameLife(settings);
