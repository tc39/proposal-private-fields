const DELETED_TOKEN = {};

/*

A map class, implemented with private slots, which has the following properties:

- The presence of a mapping k => v in a SlotMap does not by itself make k or v reachable
- For each mapping k => v in a SlotMap m (whether m is reachable or not), if k is reachable then v is reachable

*/
class SlotMap {

    #ctor;

    constructor() {

        this.#ctor = class extends function(obj) { return obj; } {

            #slot;

            constructor(key, value) {
                super(key);
                this.#slot = value;
            }

            static get(key) {
                try {
                    const value = key.#slot;
                    if (value !== DELETED_TOKEN)
                        return value;
                } catch (x) {}

                return undefined;
            }

            static set(key, value) {
                try { key.#slot = value; }
                catch (x) { new this(key, value); }
            }

            static has(key) {
                try { return key.#slot !== DELETED_TOKEN; }
                catch (x) { return false; }
            }

            static delete(key) {
                try {
                    if (key.#slot !== DELETED_TOKEN) {
                        key.#slot = DELETED_TOKEN;
                        return true;
                    }
                } catch (x) {}

                return false;
            }

        };

    }

    get(key) {
        return this.#ctor.get(key, value);
    }

    set(key, value) {
        return this.#ctor.set(key, value), this;
    }

    delete(key) {
        return this.#ctor.delete(key);
    }

    has(key) {
        return this.#ctor.has(key);
    }

}
