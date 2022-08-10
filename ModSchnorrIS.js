//ModifiedSchnorrIS

const mcl = require('mcl-wasm');
const readline = require('readline');

class Prover {
  constructor(
			/** @type {mcl.Fr} */ a,
			/** @type {mcl.G2} */ A,
			/** @type {mcl.G1} */ P,
			/** @type {mcl.G2} */ Q) 
	{
      this.a = a;
      this.A = A;
      this.P = P;
      this.Q = Q;
      this.x = new mcl.Fr();
      this.X = new mcl.G2();
	}
	
    Commitments() 
  {
    this.x = new mcl.Fr();
    this.x.setByCSPRNG();
    this.X = mcl.mul(this.Q, this.x);
    return this.X;
  }

	Response(/** @type {mcl.Fr} */ c) 
  {
	this.c = c;
    const s = mcl.add(this.x, mcl.mul(this.a, c));
	this.S = mcl.mul(mcl.hashAndMapToG1(this.X.getStr() + this.c.getStr()), s);
    return this.S;
  }
}

class Verifier {
  constructor(
			/** @type {mcl.G2} */ A, 
			/** @type {mcl.G1} */ P, 
			/** @type {mcl.G2} */ Q) 
	{
	  this.A = A;
	  this.P = P;
	  this.Q = Q;
      this.c = new mcl.Fr();
      this.X = new mcl.G2();
	}

  Challenge(/** @type {mcl.G2} */ X) 
  {
    this.X = X;
    this.c.setByCSPRNG();
    return this.c;
  }
  
  Ver(/** @type {mcl.G1} */ S) 
  {
    const U = mcl.hashAndMapToG1(this.X.getStr() + this.c.getStr());
    return mcl.pairing(S, this.Q).isEqual(mcl.pairing(U, mcl.add(this.X, mcl.mul(this.A, this.c))));
  }
}

// Sekcja Readline
const ReadL = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

//Zadaj pytanie
const Question = question => {
  return new Promise(resolve => {
    ReadL.question(question, answer => {
      resolve(JSON.parse(answer));
    });
  });
};

const main = async (type = 'verifier') => {
  await mcl.init(mcl.BLS12_381);
  // G1, G2, generowanie
  const P = mcl.hashAndMapToG1('123');
  const Q = mcl.hashAndMapToG2('123');

  if (type == 'verifier') {
    const A = new mcl.G2();
    A.setStr((await Question('A: ')).A);
    const verifier = new Verifier(A, P, Q);
	// Commitments
    const Commitments = new mcl.G2();
    Commitments.setStr((await Question('X: ')).X);

    // Challenge
    const Challenge = verifier.Challenge(Commitments);
    console.log(JSON.stringify({ c: Challenge.getStr() }));
    // Odpowiedź
    const Response = new mcl.G1();
    Response.setStr((await Question('S: ')).S);

    // Weryfikacja
    const Ver = verifier.Ver(Response);
    console.log(`Verification: ${Ver}`);

    process.exit(1);
  } else {
    // Klucz prywatny, wartość a
    const a = new mcl.Fr();
    a.setByCSPRNG();

    // Klucz publiczny, weryfikacja A
    const A = mcl.mul(Q, a);
    console.log(JSON.stringify({ A: A.getStr() }));
    const prover = new Prover(a, A, P, Q);

    // Commitments
    const Commitments = prover.Commitments();
    console.log(JSON.stringify({ X: Commitments.getStr() }));
    // Oczekiwanie na Challenge
    const Challenge = new mcl.Fr();
    Challenge.setStr((await Question('c: ')).c);
    // Odpowiedź na Challenge
    const Response = prover.Response(Challenge);
    console.log(JSON.stringify({ S: Response.getStr() }));
    process.exit(1);
  }
};

main(process.argv[2]);
