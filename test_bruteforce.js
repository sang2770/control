const { solveMauBinhBruteforce } = require('./mau_binh_bruteforce');

const cards = [22, 48, 16, 39, 50, 43, 46, 32, 8, 20, 28, 40, 44];
const start = Date.now();
const r = solveMauBinhBruteforce(cards, 10);
const elapsed = Date.now() - start;

console.log('time(ms)', elapsed);
console.log('len', r.length);
console.log('Solution 0:', r[0]);
console.log('\nAll solutions by type:');
r.forEach((x, i) => {
    console.log(`  ${i}: ${x.chi3.loai}-${x.chi2.loai}-${x.chi1.loai}`);
});
