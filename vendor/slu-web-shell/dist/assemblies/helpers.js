export function moduleHandle(id, instance) {
    return { id, instance };
}
export function indexModules(handles) {
    return new Map(handles.map((h) => [h.id, h.instance]));
}
