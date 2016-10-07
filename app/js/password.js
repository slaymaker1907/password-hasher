import SHA512 from "crypto-js/sha512";
import request from "superagent";
import BigInteger from "big-integer"

function repeatString(str, times) {
  var result = '';
  for(var i = 0; i < times; i++) {
    result += str;
  }

  return result;
}

export function defaultSalt() {
  return repeatString('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 1000);
}

function makeLazy(getter) {
  return new Promise((resolve, reject) => {
    resolve(getter());
  });
}

function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.end((err, resp) => {
      if (err) {
        reject(err);
      } else {
        resolve(resp);
      }
    });
  });
}

export class PasswordHasher {
  constructor() {
    this.bases = new BaseConstants();
  }

  special(entropy, maxLength) {
    return this.bases.getSpecial.then((base) => {
      return entropy.selectFromAll(base, maxLength, true);
    });
  }

  alphaNum(entropy, maxLength) {
    return this.bases.getAlphaNum.then((base) => {
      return entropy.selectFromAll(base, maxLength, true);
    });
  }

  numbers(entropy, maxLength) {
    return this.bases.getNumbers.then((base) => {
      return entropy.selectFromAll(base, maxLength, true);
    });
  }

  words(entropy, maxLength) {
    return this.bases.getWords.then((base) => {
      return entropy.selectFromAll(base, maxLength, false);
    });
  }

  hexidec(entropy, maxLength) {
    return this.bases.getHex.then((base) => {
      var result = entropy.selectFromAll(base, 512, true);
      return maxLength ? result.substring(0, maxLength) : result;
    });
  }
}

class BaseConstants {
  constructor() {
    this.getNumbers = makeLazy(() => {
      var numbers = [];
      for(var i = 0; i < 10; i++)
        numbers.push(i.toString());
      return numbers;
    });
    this.getSpecial = makeLazy(() => {
      var special = [];
      for(var i = 33; i < 127; i++)
        special.push(String.fromCharCode(i));
      return special;
    });
    this.getAlphaNum = makeLazy(() => {
      var alphaNum = [];
      for(var i = 48; i <= 57; i++)
        alphaNum.push(String.fromCharCode(i));
      for(var i = 65; i <= 90; i++)
        alphaNum.push(String.fromCharCode(i));
      for(var i = 97; i <= 122; i++)
        alphaNum.push(String.fromCharCode(i));
      return alphaNum;
    });
    this.getWords = requestPromise(request.get('google-10000-english-usa.txt')).then((resp) => {
      return resp.text.split('\n').map((str) =>{
        var trimmed = str.trim();
        return trimmed.substring(0, 1).toUpperCase() + trimmed.substring(1);
      });
    });
    this.getHex = makeLazy(() => {
      var result = [];
      for(var i = 0; i < 10; i++) {
        result.push(i.toString());
      }
      for(var i = 'a'.charCodeAt(0); i <= 'f'.charCodeAt(0); i++) {
        result.push(String.fromCharCode(i));
      }
      return result;
    });
  }
}

export function hashPassword(salt, id, password) {
  var toHash = salt + id + password;
  return BigInteger(SHA512(toHash).toString(), 16);
}

export function getEntropy(salt, id, password) {
  return new Entropy(hashPassword(salt, id, password));
}

export class Entropy {
  constructor(num) {
    this.num = num;
  }

  selectFrom(arr) {
    var result = this.num.divmod(BigInteger(arr.length));
    this.num = result.quotient;
    return arr[result.remainder];
  }

  selectFromAll(arr, leng, reverse) {
    var result = '';
    while(!this.isEmpty) {
      if (reverse) {
        var temp = this.selectFrom(arr) + result;
      }
      else {
        var temp = result + this.selectFrom(arr);
      }
      if (leng != null && temp.length > leng) {
        return result;
      }
      result = temp;
    }
    return result;
  }

  get isEmpty() {
    return this.num.compare(0) === 0;
  }

  get totalBits() {
    if (this.num.compare(1) < 0) {
      return 0;
    } else {
      return Math.log2(this.num.toJSNumber());
    }
  }
}
