
export const explanations = {
    objectHasExtraData: "these objects hold on to some extra data that can differ in size from object to object, like an array or hash.",
    reprs: {
        NativeRef: "Temporary objects used to make native lexicals, locals, attributes, and positional values usable like a read-write Scalar.",
        VMHash: "Representation for objects that have key-value access using a hash table.",
        MVMContext: "Objects used to hold on to lexical scopes for later traversal.",
        ConcBlockingQueue: "Objects that implement a queue that blocks when no value is present while trying to receive one.",
    },
    types: {
        BOOTCode: `This is the type for closures. Whenever a routine or block gets returned from a function, it holds on to data from that function and outer scopes. These are represented in a BOOTCode object.`,
    }
}