const fs = require('fs');
const { Command } = require('commander');
const program = new Command();

program
  .option('-i, --input <path>', 'input JSON file')
  .option('-o, --output <path>', 'output file (optional)')
  .option('-d, --display', 'display result in console')
  .option('-s, --survived', 'show only survived passengers')
  .option('-a, --age', 'display age of passengers');

program.parse(process.argv);
const options = program.opts();

// Перевірка обовʼязкового параметра
if (!options.input) {
  console.error("Please, specify input file");
  process.exit(1);
}

// Перевірка існування файлу
if (!fs.existsSync(options.input)) {
  console.error("Cannot find input file");
  process.exit(1);
}

// Читання JSON, построчно
let data = [];
try {
  const lines = fs.readFileSync(options.input, 'utf8')
                  .split(/\r?\n/)   // Розбиваємо на рядки
                  .filter(line => line.trim() !== ''); // Ігноруємо порожні рядки

  lines.forEach(line => {
    try {
      data.push(JSON.parse(line));
    } catch (err) {
      console.error("Invalid JSON format in line:", line);
      process.exit(1);
    }
  });
} catch (err) {
  console.error("Cannot read input file");
  process.exit(1);
}

// Фільтрація за виживанням, якщо задано -s
if (options.survived) {
  data = data.filter(p => p.Survived === "1" || p.Survived === 1);
}

// Формування рядків для виводу
const outputLines = data.map(p => {
  let line = p.Name;
  if (options.age) line += ` ${p.Age ?? "N/A"}`;
  line += ` ${p.Ticket}`;
  return line;
});

// Якщо не задано -o і -d, нічого не робимо
if (!options.output && !options.display) process.exit(0);

// Вивід у консоль
if (options.display) {
  outputLines.forEach(line => console.log(line));
}

// Запис у файл
if (options.output) {
  fs.writeFileSync(options.output, outputLines.join("\n"));
}
