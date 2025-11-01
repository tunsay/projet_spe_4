import EventEmitter from "events";

// Single shared event bus used to communicate events across services
const eventBus = new EventEmitter();

export default eventBus;
