
const clean = (val) => val ? String(val).replace(/[^0-9.,]/g, '') : ' ';

const testCases = [
    { name: "Undefined", val: undefined },
    { name: "Null", val: null },
    { name: "Empty String", val: "" },
    { name: "Space", val: " " },
    { name: "Number 10", val: 10 },
    { name: "String 10", val: "10" },
    { name: "String 10%", val: "10%" },
    { name: "String (10)", val: "(10)" },
    { name: "String text", val: "text" },
];

console.log("--- Testing Formatting Logic ---");

testCases.forEach(test => {
    const val = test.val;
    const formatted = `(${clean(val)})% Macro`;
    console.log(`Input: ${String(test.val)} (${typeof test.val}) -> Clean: '${clean(val)}' -> Result: '${formatted}'`);
});
