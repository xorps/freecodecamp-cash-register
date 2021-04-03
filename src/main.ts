type Bill = "PENNY" | "NICKEL" | "DIME" | "QUARTER" | "ONE" | "FIVE" | "TEN" | "TWENTY" | "ONE HUNDRED";
type Status = "INSUFFICIENT_FUNDS" | "CLOSED" | "OPEN";
type Cents = bigint;
type Optional<T> = T | typeof Nothing;
const Nothing = undefined;

const cost: (bill: Bill) => Cents = (() => {
    const table: Record<Bill, Cents> = {
        PENNY: BigInt(1),
        NICKEL: BigInt(5),
        DIME: BigInt(10),
        QUARTER: BigInt(25),
        ONE: BigInt(100),
        FIVE: BigInt(5 * 100),
        TEN: BigInt(10 * 100),
        TWENTY: BigInt(20 * 100),
        "ONE HUNDRED": BigInt(100 * 100)
    };
    return (bill: Bill) => table[bill];
})();

function sort<T>(drawer: Array<[Bill, T]>): Array<[Bill, T]> {
    function compare(a: [Bill, T], b: [Bill, T]) {
        const [A, B] = [cost(a[0]), cost(b[0])];
        if (A < B) return 1;
        if (A > B) return -1;
        return 0;
    }
    return [...drawer].sort(compare);
}

function convert(drawer: Array<[Bill, Cents]>): Array<[Bill, number]> {
    // The number conversion here must be done inline, otherwise NaN results, I'm not sure why this happens yet.
    return sort(drawer).map(([a, b]) => [a, Number(b) / 100]);
}

function cents(n: number): Cents {
    return BigInt(Math.round(n * 100));
}

class Change {
    constructor(private readonly data: Array<[Bill, Cents]> = []) {}
    add(bill: Bill): Change {
        const idx = this.data.findIndex(([_bill, _]) => _bill === bill);
        if (idx === -1) return new Change([...this.data, [bill, cost(bill)]]);
        const data = [...this.data];
        data[idx][1] += cost(bill);
        return new Change(data);
    }
    sorted(): Array<[Bill, number]> {
        return convert(this.data);
    }
}

class Drawer {
    private constructor(private readonly data: Array<[Bill, Cents]>) {}
    static create(data: Array<[Bill, number]>): Drawer {
        return new Drawer(sort(data.map(([a, b]) => [a, cents(b)])));
    }
    total(): Cents {
        const second = <A, B>(a: [A, B]) => a[1];
        return this.data.map(second).reduce((a, b) => a + b, BigInt(0));
    }
    empty(): boolean {
        return this.total() === BigInt(0);
    }
    next_bill(amount: Cents): Optional<Bill> {
        const entry = this.data.find(([bill, n]) => cost(bill) <= amount && n > BigInt(0));
        if (entry === undefined) return Nothing;
        const [bill] = entry;
        return bill;
    }
    remove(bill: Bill): Drawer {
        const drawer = [...this.data];
        const idx = drawer.findIndex(it => it[0] === bill);
        if (idx === -1) throw new Error('unexpected -1 index');
        drawer[idx][1] -= cost(bill);
        return new Drawer(drawer);
    }
    sorted(): Array<[Bill, number]> {
        return convert(this.data);
    }
}

function total(cid: Array<[Bill, number]>): number {
    const second = <A, B>(a: [A, B]) => a[1];
    return cid.map(second).reduce((a, b) => a + b, 0);
}

function loop(change: Change, amount: Cents, drawer: Drawer): {status: Status; change: Array<[Bill, number]>} {
    if (amount === 0n) return {status: "OPEN", change: change.sorted()};
    const bill = drawer.next_bill(amount);
    if (bill === Nothing) return {status: "INSUFFICIENT_FUNDS", change: []};
    return loop(change.add(bill), amount - cost(bill), drawer.remove(bill));
}

export function checkCashRegister(price: number, cash: number, cid: Array<[Bill, number]>): {status: Status; change: Array<[Bill, number]>} {
    if (total(cid) === cash - price) return {status: "CLOSED", change: cid};
    return loop(new Change(), cents(cash) - cents(price), Drawer.create(cid));
}