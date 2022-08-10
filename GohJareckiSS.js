//GohJareckiSS

const mcl = require('mcl-wasm');
const readline = require('readline');
const crypto = require('crypto');

class Signer {
  constructor(/** @type {mcl.Fr} */ a, 
			  /** @type {mcl.G1} */ A, 
			  /** @type {mcl.G1} */ g) 
	{
    this.a = a;
    this.A = A;
    this.g = g;
	}

  sign(/** @type {string} */ m) {
    const r = crypto.randomBytes(16).toString('hex');
    const h = mcl.hashAndMapToG1(m + r);
    const z = mcl.mul(h, this.a);

    const k = new mcl.Fr();
    k.setByCSPRNG();

    const u = mcl.mul(this.g, k);
    const v = mcl.mul(h, k);

    // Map Hashing
    const c = mcl.hashToFr(
      this.g.getStr() + h.getStr() + this.A.getStr() + z.getStr() + u.getStr() + v.getStr()
    );

    const cx = mcl.mul(this.a, c);
    const s = mcl.add(k, cx);

    return { s, c, z, r };
  }
}

class Verifier {
  constructor(/** @type {mcl.G1} */ A, 
			  /** @type {mcl.G1} */ g) 
	{
    this.A = A;
    this.g = g;
    }

  Ver(/** @type {{ s: mcl.Fr, c: mcl.Fr, z: mcl.G1, r: string }} */ { s, c, z, r },
		 /** @type {string} */ m) 
	{
    const h = mcl.hashAndMapToG1(m + r);

    const gs = mcl.mul(this.g, s);
    const yc = mcl.mul(this.A, c);
    const u = mcl.sub(gs, yc);

    const hs = mcl.mul(h, s);
    const zc = mcl.mul(z, c);
    const v = mcl.sub(hs, zc);

    // Map Hashing
    const cPrim = mcl.hashToFr(
      this.g.getStr() + h.getStr() + this.A.getStr() + z.getStr() + u.getStr() + v.getStr()
    );

    return cPrim.isEqual(c);
  }
}

// Sekcja Readline
const ReadL = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestions = (/** @type {string[]} */ questions) => {
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
  const g = mcl.hashAndMapToG1('abc');

  if (type == 'verifier') {
    const A = new mcl.G1();
    A.setStr((await askQuestions(['A'])).A);
    const verifier = new Verifier(A, g);
    const sczrm = await askQuestions(['s', 'c', 'z', 'r', 'm']);
    const s = new mcl.Fr();
    s.setStr(sczrm.s);
    const c = new mcl.Fr();
    c.setStr(sczrm.c);
    const z = new mcl.G1();
    z.setStr(sczrm.z);
    const r = sczrm.r;
    const m = sczrm.m;

    const Ver = verifier.Ver({ s, c, z, r }, m);
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
    const signer = new Signer(a, A, g);
    const { s, c, z, r } = signer.sign(m);
    console.log(JSON.stringify({ s: s.getStr(), c: c.getStr(), z: z.getStr(), r, m, A: A.getStr() }));
    process.exit(1);
  }
};

main(process.argv[2]);
