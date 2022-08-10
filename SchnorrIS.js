//SchnorrIS

const mcl = require('mcl-wasm');
const readline = require('readline');

class Prover {
  constructor(
			/** @type {mcl.Fr} */ a, 
			/** @type {mcl.G1} */ A, 
			/** @type {mcl.G1} */ g) 
	{
    this.a = a;
    this.A = A;
    this.g = g;
    this.x = new mcl.Fr();
    this.X = new mcl.G1();
	}

  Commitments() {
    this.x = new mcl.Fr();
    this.x.setByCSPRNG();
    this.X = mcl.mul(this.g, this.x);
    return this.X;
  }

  Response(/** @type {mcl.Fr} */ c) 
  {
    this.c = c;
    this.s = mcl.add(this.x, mcl.mul(this.a, c));
    return this.s;
  }
}

class Verifier {
  constructor(
			/** @type {mcl.G1} */ A, 
			/** @type {mcl.G1} */ g) 
	{
    this.A = A;
    this.g = g;
    this.c = new mcl.Fr();
    this.X = new mcl.G1();
	}

  Challenge(/** @type {mcl.G1} */ X) 
  {
    this.X = X;
    this.c.setByCSPRNG();
    return this.c;
  }

  Ver(/** @type {mcl.Fr} */ s) 
  {
    return mcl.mul(this.g, s).isEqual(mcl.add(this.X, mcl.mul(this.A, this.c)));
  }
}

// Sekcja Readline
const ReadL = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const main = async (type = 'verifier') => {
  await mcl.init(mcl.BLS12_381);

  if (type == 'verifier') {
    const g = new mcl.G1();
    g.setHashOf('abc');
    const StringifyA = await new Promise(resolve =>
      ReadL.question('A: ', ans => {
        resolve(ans);
      })
    );

    const A = new mcl.G1();
    A.setStr(JSON.parse(StringifyA).A);
    const verifier = new Verifier(A, g);
    const StringifyX = await new Promise(resolve =>
      ReadL.question('X: ', ans => {
        resolve(ans);
      })
    );

    const X = new mcl.G1();
    X.setStr(JSON.parse(StringifyX).X);
    const c = verifier.Challenge(X);
    console.log(JSON.stringify({ c: c.getStr() }));
    const StringifyS = await new Promise(resolve =>
      ReadL.question('s: ', ans => {
        resolve(ans);
      })
    );

    const s = new mcl.Fr();
    s.setStr(JSON.parse(StringifyS).s);
    const Ver = verifier.Ver(s);
    console.log(`Verification: ${Ver}`);
  } else {
	// G1, generator
    const g = new mcl.G1();
    g.setHashOf('abc');

    // Klucz prywatny, wartość a
    const a = new mcl.Fr();
    a.setByCSPRNG();

	// Klucz publiczny, weryfikacja A
    const A = mcl.mul(g, a);
    console.log(JSON.stringify({ A: A.getStr() }));
    const prover = new Prover(a, A, g);
    const X = prover.Commitments();
    console.log(JSON.stringify({ X: X.getStr() }));

    const StringifyC = await new Promise(resolve =>
      ReadL.question('c: ', ans => {
        resolve(ans);
      })
    );

    const c = new mcl.Fr();
    c.setStr(JSON.parse(StringifyC).c);
    const Response = prover.Response(c);
    console.log(JSON.stringify({ s: Response.getStr() }));
  }
};

main(process.argv[2]);
