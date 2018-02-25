const arrayOrUndefined = (data) => {
    if (typeof data === 'undefined' || Array.isArray(data)) {
        return data
    }
    return [data]
}
module.exports = {
    arrayOrUndefined
}