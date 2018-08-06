export function randomString(length: number, chars: string) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

//or as a Number prototype method:
export function padLeft (str: string, len: number, c: string) {
    var c = c || '0';
    while (str.length < len)
        str = c + str;

    return str;
}