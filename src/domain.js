let parameters = {
    domain: { messageType: 'WrapSquareDomain', size: 150 },
    initFunc: { p: .5, a: 0, b: 0 },
    updateFunc: { a_: 0, b_: 0, c_: 0, r1: .1, r2: .01 },
}
let running = false
let domain = null
let initFunc = null
let updateFunc = null

const makeZeroSquare = n => [...Array(n)].map(_ => [...Array(n)].map(_ => 0))
const delay = t => new Promise(res => setTimeout(res, t))

class WrapSquareDomain {
    constructor(size) {
        this.size = size
        this.grid = null
        this.t = 0
    }

    initialize(initFunc, params) {
        // console.log('initializing domain', this, arguments)
        this.grid = makeZeroSquare(this.size)
        for (let i = 0; i < this.size; ++i) {
            for (let j = 0; j < this.size; ++j) {
                const spacetimeInfo = this.getSpaceTimeInfo(i, j)
                this.grid[i][j] = initFunc(spacetimeInfo, params)
            }
        }
    }

    getNeighborhood(i, j) {
        // console.log('getNeighborhood', i, j, this)
        const grid = this.grid
        const rows = grid.length
        const columns = grid[0].length

        const u = (i - 1 + rows) % rows
        const d = (i + 1) % rows
        const l = (j - 1 + columns) % columns
        const r = (j + 1) % columns

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
        }
    }

    getFeaturesAndNeighborhood(i, j) {
        const N = this.getNeighborhood(i, j)
        const { c, n, ne, e, se, s, sw, w, nw, } = N
        const grid = this.grid
        const rows = grid.length
        const columns = grid[0].length

        const u = (i - 1 + rows) % rows
        const d = (i + 1) % rows
        const l = (j - 1 + columns) % columns
        const r = (j + 1) % columns

        return {
            neighborhood: N,
            features: {
                top: nw + n + ne,
                right: ne + e + se,
                bottom: sw + s + se,
                left: nw + w + sw,
                X: c + nw + ne + se + sw,
                O: n + ne + e + se + s + sw + w + nw,
                corners: nw + ne + se + sw,
                cardinals: n + e + s + w,
                sum: c + n + ne + e + se + s + sw + w + nw,
            }
        }
    }

    getSpaceTimeInfo(i, j) {
        return {
            t: this.t,
            t_150: this.t % 150,
            i,
            j,
            parity: (i + j) % 2,
            quadrant: 2 * (i > this.size / 2) + (j < this.size / 2),
            x: i - this.size / 2,
            y: j - this.size / 2,
            r: Math.floor(Math.hypot(i - this.size / 2, j - this.size / 2)),
        }

    }

    update(updateFunc, params) {
        const result = makeZeroSquare(this.size)
        for (let i = 0; i < this.size; ++i) {
            for (let j = 0; j < this.size; ++j) {
                const { neighborhood, features } = this.getFeaturesAndNeighborhood(i, j)
                const spacetimeInfo = this.getSpaceTimeInfo(i, j)
                result[i][j] = updateFunc(
                    neighborhood,
                    features,
                    spacetimeInfo,
                    params
                )
            }
        }
        this.grid = result
        this.t += 1
    }
}

let stopDrawingCallback = null

const doInit = () => {
    // console.log('doing init...')
    if (checkPreconditions()) {
        // console.log('preconditions checked...')
        domain.initialize(initFunc, parameters.initFunc)
        // console.log('posting message from domain')
        postMessage({ messageType: 'grid', data: domain.grid })
    } else {
        postMessage({ messageType: 'info', data: 'doInit failed' })
    }
}

onmessage = e => {
    // console.log('domain message: ', e)
    try {
        const message = 'messageType' in e ? e : e.data

        if (message.messageType == 'init') {
            doInit()
            return
        } else if (message.messageType == 'start') {
            // console.log('DOMAIN STARTING')
            running = true
            return
        } else if (message.messageType == 'stop') {
            // console.log('DOMAIN STOPPING')
            running = false
            return
        } else if (message.messageType == 'sync') {
            const data = { ...parameters, text: { initFunc: initFunc.toString(), updateFunc: updateFunc.toString() } }
            // console.log('syncing', data);
            postMessage({ ...data, messageType: 'sync' })
            return
        }

        if ('parameters' in message.data) {
            console.log('domain: setting parameters', message.data)
            message.data.parameters.domain = { ...message.data.parameters.domain, ...(message.data.parameters.domain || {}) }
        }

        if ('updateFunc' in message.data) {
            console.log('domain: setting update func', message.data)
            try {
                updateFunc = eval(message.data.updateFunc)
            } catch (error) {
                console.error(error)
            }
        }
        if ('initFunc' in message.data) {
            console.log('domain: setting init func', message.data)
            try {
                initFunc = eval(message.data.initFunc)
                doInit()
            } catch (error) {
                console.error(error)
            }
        }
    } catch (error) {
        console.error('domain error', error)
    }
}

const checkPreconditions = () => {
    satisfied = true
    if (domain === null) {
        console.warn('domain is null, creating')
        domain = new WrapSquareDomain(parameters.domain.size)
    } else if (!(domain instanceof WrapSquareDomain)) {
        console.error('domain type error: ', domain)
        satisfied = false
    }
    if (typeof initFunc !== 'function') {
        console.error('initFunc type error: ', initFunc)
        satisfied = false
    }
    if (typeof updateFunc !== 'function') {
        console.error('updateFunc type error: ', initFunc)
        satisfied = false
    }
    return satisfied
};

(async () => {
    console.log('domain loop starting...')
    let i = 0
    while (true) {
        if (running) {
            if (!checkPreconditions()) {
                running = false
                console.warn('domain is not running!')
                await new Promise(res => setTimeout(res, 10))
                continue
            }
            i += 1
            domain.update(updateFunc, parameters.updateFunc)
            postMessage({ messageType: 'grid', data: domain.grid, })
            if ((i % 200) == 0) {
                console.log('updating', i)
            }
            await delay(1)
        } else {
            await delay(5)
        }
    }
    console.log('domain loop done')
})()