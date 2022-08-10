//OkamotoIS

const mcl = require('mcl-wasm');
const readline = require('readline');

class Prover {
  constructor(
			/** @type {mcl.Fr} */ a1,
			/** @type {mcl.Fr} */ a2,
			/** @type {mcl.G1} */ A,
			/** @type {mcl.G1} */ g1,
			/** @type {mcl.G1} */ g2) 
	{
    this.a1 = a1;
    this.a2 = a2;
    this.A = A;
    this.g1 = g1;
    this.g2 = g2;
    this.x1 = new mcl.Fr();
    this.x2 = new mcl.Fr();
    this.X = new mcl.G1();
	}

    Commitments() {
    this.x1.setByCSPRNG();
    this.x2.setByCSPRNG();
    this.X = mcl.add(mcl.mul(this.g1, this.x1), mcl.mul(this.g2, this.x2));
    return this.X;
  }

  	Response(/** @type {mcl.Fr} */ c) 
  {
	this.c = c;
    this.s1 = mcl.add(this.x1, mcl.mul(this.a1, c));
    this.s2 = mcl.add(this.x2, mcl.mul(this.a2, c));
    return [this.s1, this.s2];
  }
}

class Verifier {
  constructor(
			/** @type {mcl.G1} */ A, 
			/** @type {mcl.G1} */ g1, 
			/** @type {mcl.G1} */ g2) 
  {
    this.A = A;
    this.g1 = g1;
    this.g2 = g2;
    this.c = new mcl.Fr();
    this.X = new mcl.G1();
  }

  Challenge(/** @type {mcl.G1} */ X) 
  {
    this.X = X;
    this.c.setByCSPRNG();
    return this.c;
  }

    Ver(/** @type {mcl.Fr} */ s1, /** @type {mcl.Fr} */ s2) 
  {
    return mcl
      .add(mcl.mul(this.g1, s1), mcl.mul(this.g2, s2))
      .isEqual(mcl.add(this.X, mcl.mul(this.A, this.c)));
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
  const g1 = new mcl.G1();
  const g2 = new mcl.G1();
  g1.setHashOf('123');
  g2.setHashOf('321');

  if (type == 'verifier') {
    const A = new mcl.G1();
    A.setStr((await Question('A: ')).A);

    const verifier = new Verifier(A, g1, g2);

    // Commitments
    const Commitments = new mcl.G1();
    Commitments.setStr((await Question('X: ')).X);

    // Challenge
    const Challenge = verifier.Challenge(Commitments);
    console.log(JSON.stringify({ c: Challenge.getStr() }));

    // Odpowiedź
    /** @type {{s1: string, s2: string}} */
    const { s1, s2 } = await Question('s1,s2: ');
    const Response = [new mcl.Fr(), new mcl.Fr()];
    Response[0].setStr(s1);
    Response[1].setStr(s2);

    // Weryfikacja
    const Ver = verifier.Ver(...Response);
    console.log(`Verification: ${Ver}`);

    process.exit(1);
  } else {
	// Klucz prywatny, wartość a1, a2
    const a1 = new mcl.Fr();
    const a2 = new mcl.Fr();
    a1.setByCSPRNG();
    a2.setByCSPRNG();

	// Klucz publiczny, weryfikacja A
    const A = mcl.add(mcl.mul(g1, a1), mcl.mul(g2, a2));
    console.log(JSON.stringify({ A: A.getStr() }));
    const prover = new Prover(a1, a2, A, g1, g2);

    // Commitments
    const Commitments = prover.Commitments();
    console.log(JSON.stringify({ X: Commitments.getStr() }));
    // Oczekiwanie na Challenge
    const Challenge = new mcl.Fr();
    Challenge.setStr((await Question('c: ')).c);
    // Odpowiedź na Challenge
    const Response = prover.Response(Challenge);
    console.log(JSON.stringify({ s1: Response[0].getStr(), s2: Response[1].getStr() }));

    process.exit(1);
  }
};

main(process.argv[2]);
