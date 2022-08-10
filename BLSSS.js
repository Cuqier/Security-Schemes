//BLSSS

const mcl = require('mcl-wasm');
const readline = require('readline');

class Signer {
  constructor(/** @type {mcl.Fr} */ a, 
			  /** @type {mcl.G2} */ g) 
	{
    this.a = a;
    this.g = g;
	}

  sign(/** @type {string} */ m) {
    // H(m)
    const h = mcl.hashAndMapToG1(m);

    // H(m) * a
    return mcl.mul(h, this.a);
  }
}

class Verifier {
  constructor(/** @type {mcl.G2} */ A, 
			  /** @type {mcl.G2} */ g) 
	{
    this.A = A;
    this.g = g;
	}

  Ver(/** @type {mcl.G1} */ s, 
		 /** @type {string} */ m) 
	{
    // H(m)
    const h = mcl.hashAndMapToG1(m);

    // e(s, g) == e(H(m), A)
    return mcl.pairing(s, this.g).isEqual(mcl.pairing(h, this.A));
	}
}

// Sekcja Readline
const ReadL = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Zadaj pytanie
const Question = (/** @type {string[]} */ questions) => {
  return new Promise(async resolve => {
    const answers = {};

    while (questions.filter(elem => Object.keys(answers).indexOf(elem) === -1).length) {
      const parsedJSON = await new Promise(innerResolve =>
        ReadL.question(
          questions.filter(elem => Object.keys(answers).indexOf(elem) === -1).join(', ') + ': ',
          answer => innerResolve(JSON.parse(answer))
        )
      );

      for (const [key, value] of Object.entries(parsedJSON)) answers[key] = value;
    }

    resolve(answers);
  });
};

const main = async (type = 'verifier') => {
  await mcl.init(mcl.BLS12_381);

  // Generator
  const g = mcl.hashAndMapToG2('abc');

  if (type == 'verifier') {
    const A = new mcl.G2();
    A.setStr((await Question(['A'])).A);
    const verifier = new Verifier(A, g);
    const ms = await Question(['s', 'm']);
    const s = new mcl.G1();
    s.setStr(ms.s);
    const m = ms.m;

    const Ver = verifier.Ver(s, m);
    console.log(`Verification: ${Ver}`);

    process.exit(1);
  } else {
    const m = 'Hello World';

    // Klucz prywatny, wartość a
    const a = new mcl.Fr();
    a.setByCSPRNG();

    // Klucz publiczny, wartość A
    const A = mcl.mul(g, a);
    console.log(JSON.stringify({ A: A.getStr() }));

	// Podpisanie
    const signer = new Signer(a, g);
    const s = signer.sign(m);
    console.log(JSON.stringify({ A: A.getStr(), s: s.getStr(), m }));
    process.exit(1);
  }
};

main(process.argv[2]);
