const FormulaError = require('../error');
const ReferenceFunctions = require('./reference');
const {FormulaHelpers, Types, Factorials, ParamsTypes} = require('../helpers');
const H = FormulaHelpers;

// factorials
const f = [], fd = [];

function factorial(n) {
    if (n <= 100)
        return Factorials[n];
    if (f[n] > 0)
        return f[n];
    return f[n] = factorial(n - 1) * n;
}

function factorialDouble(n) {
    if (n === 1 || n === 0)
        return 1;
    if (n === 2)
        return 2;
    if (fd[n] > 0)
        return fd[n];
    return fd[n] = factorialDouble(n - 2) * n;
}

// https://support.office.com/en-us/article/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb
const MathFunctions = {
    ABS: number => {
        number = H.accept(number, Types.NUMBER);
        return Math.abs(number);
    },

    AGGREGATE: (functionNum, options, ref1, ...refs) => {
        functionNum = H.accept(functionNum, Types.NUMBER);
        throw FormulaError.NOT_IMPLEMENTED('AGGREGATE');
    },

    ARABIC: text => {
        text = H.accept(text, Types.STRING).toUpperCase();
        // Credits: Rafa? Kukawski
        if (!/^M*(?:D?C{0,3}|C[MD])(?:L?X{0,3}|X[CL])(?:V?I{0,3}|I[XV])$/.test(text)) {
            throw FormulaError.VALUE;
        }
        let r = 0;
        text.replace(/[MDLV]|C[MD]?|X[CL]?|I[XV]?/g, function (i) {
            r += {
                M: 1000,
                CM: 900,
                D: 500,
                CD: 400,
                C: 100,
                XC: 90,
                L: 50,
                XL: 40,
                X: 10,
                IX: 9,
                V: 5,
                IV: 4,
                I: 1
            }[i];
        });
        return r;
    },

    BASE: (number, radix, minLength = 0) => {
        number = H.accept(number, Types.NUMBER);
        if (number < 0 || number > 2 ** 53)
            throw FormulaError.NUM;
        radix = H.accept(radix, Types.NUMBER);
        if (radix < 2 || radix > 36)
            throw FormulaError.NUM;
        minLength = H.accept(minLength, Types.NUMBER);
        if (!minLength && minLength < 0) {
            throw FormulaError.NUM;
        }

        const result = number.toString(radix);
        return new Array(Math.max(minLength + 1 - result.length, 0)).join('0') + result;
    },

    CEILING: (number, significance) => {
        number = H.accept(number, Types.NUMBER);
        if (number >= 9.99E+307 || number <= -2.229E+308)
            throw FormulaError.NUM;
        significance = H.accept(significance, Types.NUMBER);
        if (significance === 0)
            return 0;
        if (number / significance % 1 === 0)
            return number;
        const absSignificance = Math.abs(significance);
        const times = Math.floor(Math.abs(number) / absSignificance);
        if (number < 0) {
            // round down, away from zero
            const roundDown = significance < 0;
            return roundDown ? -absSignificance * (times + 1) : -absSignificance * (times);
        } else {
            return (times + 1) * absSignificance;
        }
    },

    'CEILING.MATH': (number, significance, mode) => {
        number = H.accept(number, Types.NUMBER);
        if (number >= 9.99E+307 || number <= -2.229E+308)
            throw FormulaError.NUM;
        significance = H.accept(significance, Types.NUMBER, number > 0 ? 1 : -1);
        // mode can be any number
        mode = H.accept(mode, Types.NUMBER, 0);
        // The Mode argument does not affect positive numbers.
        if (number >= 0) {
            return MathFunctions.CEILING(number, significance);
        }
        // if round down, away from zero, then significance
        const offset = mode ? significance : 0;
        return MathFunctions.CEILING(number, significance) - offset;
    },

    'CEILING.PRECISE': (number, significance) => {
        number = H.accept(number, Types.NUMBER);
        significance = H.accept(significance, Types.NUMBER, 1);
        // always round up
        return MathFunctions.CEILING(number, Math.abs(significance));
    },

    COMBIN: (number, numberChosen) => {
        number = H.accept(number, Types.NUMBER);
        numberChosen = H.accept(numberChosen, Types.NUMBER);
        if (number < 0 || numberChosen < 0 || number < numberChosen)
            throw FormulaError.NUM;
        const nFactorial = MathFunctions.FACT(number), kFactorial = MathFunctions.FACT(numberChosen);
        return nFactorial / kFactorial / MathFunctions.FACT(number - numberChosen);
    },

    COMBINA: (number, numberChosen) => {
        number = H.accept(number, Types.NUMBER);
        numberChosen = H.accept(numberChosen, Types.NUMBER);
        // special case
        if ((number === 0 || number === 1) && numberChosen === 0)
            return 1;
        if (number < 0 || numberChosen < 0)
            throw FormulaError.NUM;
        return MathFunctions.COMBIN(number + numberChosen - 1, number - 1);
    },

    DECIMAL: (text, radix) => {
        text = H.accept(text, Types.STRING);
        radix = H.accept(radix, Types.NUMBER);
        radix = Math.trunc(radix);
        if (radix < 2 || radix > 36)
            throw FormulaError.NUM;
        return parseInt(text, radix);
    },

    DEGREES: (radians) => {
        radians = H.accept(radians, Types.NUMBER);
        return radians * (180 / Math.PI);
    },

    EVEN: (number) => {
        return MathFunctions.CEILING(number, -2);
    },

    EXP: (number) => {
        number = H.accept(number, Types.NUMBER);
        return Math.exp(number)
    },

    FACT: (number) => {
        number = H.accept(number, Types.NUMBER);
        // max number = 170
        if (number > 170 || number < 0)
            throw FormulaError.NUM;
        if (number <= 100)
            return Factorials[number];
        number = Math.trunc(number);
        return factorial(number);
    },

    FACTDOUBLE: (number) => {
        number = H.accept(number, Types.NUMBER);
        // max number = 170
        if (number < -1)
            throw FormulaError.NUM;
        if (number === -1)
            return 1;
        number = Math.trunc(number);
        return factorialDouble(number);
    },

    FLOOR: (number, significance) => {
        number = H.accept(number, Types.NUMBER);
        if (number >= 9.99E+307 || number <= -2.229E+308)
            throw FormulaError.NUM;
        significance = H.accept(significance, Types.NUMBER);
        if (significance === 0)
            return 0;
        if (number > 0 && significance < 0)
            throw FormulaError.NUM;
        if (number / significance % 1 === 0)
            return number;
        const absSignificance = Math.abs(significance);
        const times = Math.floor(Math.abs(number) / absSignificance);
        if (number < 0) {
            // round down, away from zero
            const roundDown = significance < 0;
            return roundDown ? -absSignificance * times : -absSignificance * (times + 1);
        } else {
            // toward zero
            return times * absSignificance;
        }
    },

    'FLOOR.MATH': (number, significance, mode) => {
        number = H.accept(number, Types.NUMBER);
        if (number >= 9.99E+307 || number <= -2.229E+308)
            throw FormulaError.NUM;
        significance = H.accept(significance, Types.NUMBER, number > 0 ? 1 : -1);

        // mode can be 0 or any other number, 0 means away from zero
        // the official documentation seems wrong
        mode = H.accept(mode, Types.NUMBER, 0);
        // The Mode argument does not affect positive numbers.
        if (mode === 0 || number >= 0) {
            // away from zero
            return MathFunctions.FLOOR(number, Math.abs(significance));
        }
        // if away from zero, add a significance
        const offset = mode ? significance : 0;
        return MathFunctions.FLOOR(number, significance) + offset;
    },

    'FLOOR.PRECISE': (number, significance) => {
        number = H.accept(number, Types.NUMBER);
        significance = H.accept(significance, Types.NUMBER, 1);
        // always round up
        return MathFunctions.FLOOR(number, Math.abs(significance));
    },

    GCD: (...params) => {
        const arr = H.flattenParams(params, Types.NUMBER, ParamsTypes.ALLOW_RANGE_REF, param => {
            if (param < 0 || param > 9007199254740990) // 2^53
                throw FormulaError.NUM;
            return Math.trunc(param);
        }, false);
        // http://rosettacode.org/wiki/Greatest_common_divisor#JavaScript
        let i, y,
            n = params.length,
            x = Math.abs(arr[0]);

        for (i = 1; i < n; i++) {
            y = Math.abs(arr[i]);

            while (x && y) {
                (x > y) ? x %= y : y %= x;
            }
            x += y;
        }
        return x;
    },

    INT: (number) => {
        number = H.accept(number, Types.NUMBER);
        return Math.floor(number);
    },

    'ISO.CEILING': (...params) => {
        return MathFunctions['CEILING.PRECISE'](params);
    },

    LCM: (...params) => {
        // always parse string to number if possible
        const arr = H.flattenParams(params, Types.NUMBER, param => {
            if (param < 0 || param > 9007199254740990) // 2^53
                throw FormulaError.NUM;
            return Math.trunc(param);
        }, false, 1);
        // http://rosettacode.org/wiki/Least_common_multiple#JavaScript
        let n = arr.length, a = Math.abs(arr[0]);
        for (let i = 1; i < n; i++) {
            let b = Math.abs(arr[i]), c = a;
            while (a && b) {
                a > b ? a %= b : b %= a;
            }
            a = Math.abs(c * arr[i]) / (a + b);
        }
        return a;
    },

    LN: number => {
        number = H.accept(number, Types.NUMBER);
        return Math.log(number);
    },

    LOG: (number, base) => {
        number = H.accept(number, Types.NUMBER);
        base = H.accept(base, Types.NUMBER, 10);

        return Math.log(number) / Math.log(base);
    },

    LOG10: number => {
        number = H.accept(number, Types.NUMBER);
        return Math.log10(number);
    },

    MDETERM: (array) => {
        array = H.accept(array, Types.ARRAY, null, false, true);
        if (array[0].length !== array.length)
            throw FormulaError.VALUE;
        // adopted from https://github.com/numbers/numbers.js/blob/master/lib/numbers/matrix.js#L261
        const numRow = array.length, numCol = array[0].length;
        let det = 0, diagLeft, diagRight;

        if (numRow === 1) {
            return array[0][0];
        } else if (numRow === 2) {
            return array[0][0] * array[1][1] - array[0][1] * array[1][0];
        }

        for (let col = 0; col < numCol; col++) {
            diagLeft = array[0][col];
            diagRight = array[0][col];

            for (let row = 1; row < numRow; row++) {
                diagRight *= array[row][(((col + row) % numCol) + numCol) % numCol];
                diagLeft *= array[row][(((col - row) % numCol) + numCol) % numCol];
            }

            det += diagRight - diagLeft;
        }

        return det;
    },

    MINVERSE: (array) => {
        // TODO
        // array = H.accept(array, Types.ARRAY, null, false);
        // if (array[0].length !== array.length)
        //     throw FormulaError.VALUE;
        // throw FormulaError.NOT_IMPLEMENTED('MINVERSE');
    },

    MMULT: (array1, array2) => {
        array1 = H.accept(array1, Types.ARRAY, null, false, true);
        array2 = H.accept(array2, Types.ARRAY, null, false, true);
        if (array1[0].length !== array1.length)
            throw FormulaError.VALUE;
        // https://github.com/numbers/numbers.js/blob/master/lib/numbers/matrix.js#L233
        const result = [];

        for (let x = 0; x < array1.length; x++) {
            result[x] = [];
        }

        const array2_T = ReferenceFunctions.TRANSPOSE(array2);

        for (let i = 0; i < array1.length; i++) {
            for (let j = 0; j < array2[i].length; j++) {
                array1[i].forEach(val => {
                    if (typeof val !== "number") throw FormulaError.VALUE
                });
                array2_T[j].forEach(val => {
                    if (typeof val !== "number") throw FormulaError.VALUE
                });
                result[i][j] = MathFunctions.SUMPRODUCT([array1[i]], [array2_T[j]]);
            }
        }
        return result;
    },

    MOD: () => {

    },

    // TODO: Start from here.
    MROUND: () => {

    },

    MULTINOMIAL: () => {

    },

    MUNIT: () => {

    },

    ODD: () => {

    },

    PI: () => {
        return Math.PI;
    },

    POWER: (number, power) => {
        number = H.accept(number, Types.NUMBER);
        power = H.accept(power, Types.NUMBER);
        return number ** power;
    },

    PRODUCT: () => {

    },

    QUOTIENT: () => {

    },

    RADIANS: (degrees) => {
        degrees = H.accept(degrees, Types.NUMBER);
        return degrees / 180 * Math.PI;
    },

    ROUND: (number, digits) => {
        number = H.accept(number, Types.NUMBER);
        digits = H.accept(digits, Types.NUMBER);

        const multiplier = Math.pow(10, Math.abs(digits));
        const sign = number > 0 ? 1 : -1;
        if (digits > 0) {
            return sign * Math.round(Math.abs(number) * multiplier) / multiplier;
        } else if (digits === 0) {
            return sign * Math.round(Math.abs(number));
        } else {
            return sign * Math.round(Math.abs(number) / multiplier) * multiplier;
        }
    },

    ROUNDDOWN: (number, digits) => {
        number = H.accept(number, Types.NUMBER);
        digits = H.accept(digits, Types.NUMBER);

        const multiplier = Math.pow(10, Math.abs(digits));
        const sign = number > 0 ? 1 : -1;
        if (digits > 0) {
            const offset = 1 / multiplier * 0.5;
            return sign * Math.round((Math.abs(number) - offset) * multiplier) / multiplier;
        } else if (digits === 0) {
            const offset = 0.5;
            return sign * Math.round((Math.abs(number) - offset));
        } else {
            const offset = multiplier * 0.5;
            return sign * Math.round((Math.abs(number) - offset) / multiplier) * multiplier;
        }
    },

    ROUNDUP: (number, digits) => {
        number = H.accept(number, Types.NUMBER);
        digits = H.accept(digits, Types.NUMBER);

        const multiplier = Math.pow(10, Math.abs(digits));
        const sign = number > 0 ? 1 : -1;
        if (digits > 0) {
            const offset = 1 / multiplier * 0.5;
            return sign * Math.round((Math.abs(number) + offset) * multiplier) / multiplier;
        } else if (digits === 0) {
            const offset = 0.5;
            return sign * Math.round((Math.abs(number) + offset));
        } else {
            const offset = multiplier * 0.5;
            return sign * Math.round((Math.abs(number) + offset) / multiplier) * multiplier;
        }
    },

    SUM: (...params) => {
        let result = 0;
        H.flattenParams(params, Types.NUMBER, item => {
            result += item;
        }, true);
        return result
    },

    SUMIF: (...params) => {

    },


    SUMPRODUCT: (array1, ...arrays) => {
        array1 = H.accept(array1, Types.ARRAY, null, false, true);
        arrays.forEach(array => {
            array = H.accept(array, Types.ARRAY, null, false, true);
            if (array1[0].length !== array[0].length || array1.length !== array.length)
                throw FormulaError.VALUE;
            for (let i = 0; i < array1.length; i++) {
                for (let j = 0; j < array1[0].length; j++) {
                    if (typeof array1[i][j] !== "number")
                        array1[i][j] = 0;
                    if (typeof array[i][j] !== "number")
                        array[i][j] = 0;
                    array1[i][j] *= array[i][j];
                }
            }
        });
        let result = 0;

        array1.forEach(row => {
            row.forEach(value => {
                result += value;
            })
        });

        return result;
    },
};


module.exports = MathFunctions;
