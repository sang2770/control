const { solveMauBinh } = require('./mau_binh_bruteforce.js');
const demo = solveMauBinh([22,48,16,39,50,43,46,32,8,20,28,40,44]);
if (demo.length > 0) {
  demo.forEach((solution, index) => {
    console.log(`Solution ${index + 1}:`);
    console.log('Player 1:', solution);
    console.log('---');
  });
}
