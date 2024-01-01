let parameters = {
    domain: { type: 'WrapSquareDomain', size: 150 },
    initFunc: { p: .5, a: 0, b: 0 },
    updateFunc: { a_: 0, b_: 0, c_: 0, r1: .1, r2: .01 },
};
let running = false;
let domain = null;
let initFunc = null;
let updateFunc = null;

const makeZeroSquare = n => [...Array(n)].map(_ => [...Array(n)].map(_ => 0));
const delay = t => new Promise(res => setTimeout(res, t));

class WrapSquareDomain {
    constructor(size) {
        this.size = size;
        this.grid = null;
        this.t = 0;
    }

    initialize(initFunc, params) {
        console.log('initializing domain', this, arguments);
        this.grid = makeZeroSquare(this.size);
        for (let i = 0; i < this.size; ++i) {
            for (let j = 0; j < this.size; ++j) {
                this.grid[i][j] = initFunc(i, j, params);
            }
        }
    }

    getNeighborhood(i, j) {
        const grid = this.grid;
        const rows = grid.length;
        const columns = grid[0].length;

        const u = (i - 1 + rows) % rows;
        const d = (i + 1) % rows;
        const l = (j - 1 + columns) % columns;
        const r = (j + 1) % columns;
        // const uu = (i - 2 + rows) % rows;
        // const dd = (i + 2) % rows;
        // const ll = (j - 2 + columns) % columns;
        // const rr = (j + 2) % columns;

        const c = grid[i][j];
        const n = grid[u][j];
        const ne = grid[u][r];
        const e = grid[i][r];
        const se = grid[d][r];
        const s = grid[d][j];
        const sw = grid[d][l];
        const w = grid[i][l];
        const nw = grid[u][l];

        const Top = nw + n + ne;
        const Right = ne + e + se;
        const Bottom = sw + s + se;
        const Left = sw + w + nw;
        const Diag1 = nw + c + se;
        const Diag2 = ne + c + sw;
        const H = w + c + e;
        const V = n + c + s;
        const Sum = Left + V + Right;

        return { c, n, ne, e, se, s, sw, w, nw, Top, Right, Bottom, Left, Diag1, Diag2, H, V, Sum };
    }

    update(updateFunc, { r1, r2, ...params }) {
        const result = makeZeroSquare(this.size);
        const t = this.t;
        const o1 = Math.sin(t / (10 * r1));
        const o2 = Math.sin(t * r2 / 100);
        for (let i = 0; i < this.size; ++i) {
            for (let j = 0; j < this.size; ++j) {
                const neighborhood = this.getNeighborhood(i, j);
                result[i][j] = updateFunc(neighborhood, { t, o1, o2, i, j }, params);
            }
        }
        this.grid = result;
        this.t += 1;
    }
}

let stopDrawingCallback = null;

onmessage = e => {
    // console.log(e);
    if (e.data == 'init') {
        running = false;
        if (checkPreconditions()) {
            domain.initialize(initFunc, parameters.initFunc);
            postMessage({ value: domain.grid, type: 'grid' });
        }
        return;
    } else if (e.data == 'start') {
        running = true;
        return;
    } else if (e.data == 'stop') {
        running = false;
        return;
    } else if (e.data == 'sync') {
        const data = { ...parameters, text: { initFunc: initFunc.toString(), updateFunc: updateFunc.toString() } };
        // console.log('syncing', data);
        postMessage({ ...data, type: 'sync' });
        return;
    } else if (e.data.type == 'init-func-text') {
        try {
            initFunc = eval(e.data.value);
        } catch (error) {
            console.error(error);
        }
    } else if (e.data.type == 'update-func-text') {
        try {
            updateFunc = eval(e.data.value);
        } catch (error) {
            console.error(error);
        }
    }
    if ('parameters' in e.data) {
        parameters.domain = { ...parameters.domain, ...(e.data.parameters.domain || {}) };
        parameters.initFunc = { ...parameters.initFunc, ...(e.data.parameters.initFunc || {}) };
        parameters.updateFunc = { ...parameters.updateFunc, ...(e.data.parameters.updateFunc || {}) };
    }
};

const checkPreconditions = () => {
    satisfied = true;
    if (domain === null) {
        // console.error('domain is null');
        // satisfied = false;
        console.warn('domain is null, creating');
        domain = new WrapSquareDomain(parameters.domain.size);
    }
    if (initFunc === null) {
        console.error('initFunc is null');
        satisfied = false;
    }
    if (updateFunc === null) {
        console.error('domain is null');
        satisfied = false;
    }
    return satisfied;
};

(async () => {
    let i = 0;
    while (true) {
        if (running) {
            if (!checkPreconditions()) {
                running = false;
                continue;
            }
            domain.update(updateFunc, parameters.updateFunc);
            i += 1;
            postMessage({ value: domain.grid, type: 'grid' });
            if ((i % 1000) == 0) {
                console.log('updating', i);
            }
            await new Promise(res => setTimeout(res, 0));
        } else {
            await delay(5);
        }
    }
})();