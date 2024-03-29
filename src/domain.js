let parameters = {};
let domainSize = 150;
let running = false;
let domain = null;
let initFunc = null;
let updateFunc = null;

const makeZeroSquare = n => new Uint8Array(function () { for (let i = 0; i < n * n; ++i) { yield 0; } });
const delay = t => new Promise(res => setTimeout(res, t));

class WrapSquareDomain {
    constructor(size) {
        this.size = size;
        this.grid = null;
        this.t = 0;

        if (initFunc !== null) { this.initialize(initFunc, parameters); }
    }

    initialize() {
        // console.log('initializing domain', this, arguments)
        const n = this.size;
        this.grid = new Uint8Array(n ** 2);
        for (let i = 0; i < n; ++i) {
            const offset = i * n;
            for (let j = 0; j < n; ++j) {
                const spacetimeInfo = this.getSpaceTimeInfo(i, j);
                // TODO: inline initFunc
                this.grid[offset + j] = initFunc(spacetimeInfo, parameters);
            }
        }
    }

    getNeighborhood(i, j) {
        // console.log('getNeighborhood', i, j, this)
        const grid = this.grid;
        const rows = grid.length;
        const columns = grid[0].length;

        const u = (i - 1 + rows) % rows;
        const d = (i + 1) % rows;
        const l = (j - 1 + columns) % columns;
        const r = (j + 1) % columns;

        return {
            c: grid[i][j],
            n: grid[u][j],
            ne: grid[u][r],
            e: grid[i][r],
            se: grid[d][r],
            s: grid[d][j],
            sw: grid[d][l],
            w: grid[i][l],
            nw: grid[u][l],
        };
    }

    getFeaturesAndNeighborhood(i, j) {
        const N = this.getNeighborhood(i, j);
        const { c, n, ne, e, se, s, sw, w, nw, } = N;
        const grid = this.grid;
        const rows = grid.length;
        const columns = grid[0].length;

        const u = (i - 1 + rows) % rows;
        const d = (i + 1) % rows;
        const l = (j - 1 + columns) % columns;
        const r = (j + 1) % columns;

        return {
            neighborhood: N,
            features: {
                top: nw + n + ne,
                right: ne + e + se,
                bottom: sw + s + se,
                left: nw + w + sw,
                X: nw + ne + se + sw,
                O: n + e + s + w,
                sum: n + ne + e + se + s + sw + w + nw,
            }
        };
    }

    getSpaceTimeInfo(i, j) {
        return {
            t: this.t,
            t_150: this.t % 150,
            i,
            j,
            parity: (i + j) % 2,
            quadrant: 2 * (i > this.size / 2) + (j > this.size / 2),
            x: j - this.size / 2,
            y: this.size / 2 - i,
            r: Math.floor(Math.hypot(i - this.size / 2, j - this.size / 2)),
            size: this.size,
        };
    }

    update() {
        const result = makeZeroSquare(this.size);
        for (let i = 0; i < this.size; ++i) {
            for (let j = 0; j < this.size; ++j) {
                const { neighborhood, features } = this.getFeaturesAndNeighborhood(i, j);
                const spacetimeInfo = this.getSpaceTimeInfo(i, j);
                result[i][j] = +updateFunc(
                    neighborhood,
                    features,
                    spacetimeInfo,
                    parameters
                );
            }
        }
        this.grid = result;
        this.t += 1;
    }
}

const outputGrid = () => { postMessage({ messageType: 'domain-grid-output', data: domain.grid }); };

const checkPreconditions = () => {
    satisfied = true;
    if (domain === null) { console.warn('domain is null, creating'); domain = new WrapSquareDomain(domainSize); }
    if (!(domain instanceof WrapSquareDomain)) { console.warn('domain type error: ', domain); satisfied = false; }
    if (typeof initFunc !== 'function') { console.warn('initFunc type error: ', initFunc); satisfied = false; }
    if (typeof updateFunc !== 'function') { console.warn('updateFunc type error: ', updateFunc); satisfied = false; }
    return satisfied;
};

const init = () => {
    if (checkPreconditions()) {
        domain.initialize();
        outputGrid();
    } else {
        console.error('init-domain failed due to preconditions check');
    }
};

const messageHandlers = {
    'init-domain': () => {
        running = false;
        init();
    },
    'start-domain-update': () => { running = true; },
    'stop-domain-update': () => { running = false; },
    'set-domain-size': message => { domainSize = message.data; domain = null; },
    'set-funcs': message => { updateFunc = eval(message.data.updateFunc); initFunc = eval(message.data.initFunc); },
    'set-parameters': message => { parameters = message.data; init(); },
};

const listenerName = 'domain';

onmessage = e => {
    const message = 'messageType' in e ? e : e.data;
    const handler = messageHandlers[message.messageType];
    if (typeof handler === 'undefined') {
        console.error(`${listenerName}: no handler for ${message.messageType}`, message, messageHandlers);
    } else if (typeof handler !== 'function') {
        console.error(`${listenerName}: handler is not a function ${message.messageType} - ${handler}`, message, messageHandlers);
    } else {
        handler(message);
    }
};

(async () => {
    console.log('domain loop starting...');
    let i = 0;
    while (true) {
        if (running) {
            if (!checkPreconditions()) {
                running = false;
                console.warn('domain is not running!');
                await delay(10);
                continue;
            }
            i += 1;
            domain.update();
            outputGrid();
            if ((i % 200) == 0) { console.log('updating', i); }
            await delay(1);
        } else {
            await delay(5);
        }
    }
    console.log('domain loop done');
})();