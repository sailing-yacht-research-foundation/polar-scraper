const wrongData = '1,052.5';
console.log(parseFloat(wrongData.replace(/,/g, '')));

const incorrectTag = 'Beat VMG';
console.log(parseFloat(incorrectTag.replace('°', '')));

// console.log(parseFloat(undefined));
// console.log(isNaN(undefined));

console.log(new Date(1991, 1, 4));
