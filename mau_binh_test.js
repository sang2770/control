const { solveMauBinh } = require('./mau_binh_logic.js');

const demo = solveMauBinh([1, 48, 51, 4, 16, 18, 32, 35, 36, 39, 41, 12, 14]);
if (demo.length > 0) {
  demo.forEach((solution, index) => {
    console.log(`Solution ${index + 1}:`);
    console.log('Player 1:', solution);
    console.log('---');
  });
}
