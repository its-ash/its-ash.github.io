---
title: Diamond Pattern in JS
description: Print Diamond Pattern in JS
lang: 'js'
tag: [ 'javascript', 'pattern', 'diamond' ]
slug: 'diamond-pattern-js'
---




# Diamond Pattern using nested loops

<CodeBlock>

```js
let width = 10;

for (let i = 0; i < width; i++) {

        for (let x = width; x != i; x--) {
                process.stdout.write(" ")
        }

        for (let j = 0; j < i; j++) {
                process.stdout.write("* ")
        }
        console.log("");
}

for (let i = width; i != 0; i--) {

        for (let x = width; x != i; x--) {
                process.stdout.write(" ")
        }

        for (let j = 0; j < i; j++) {
                process.stdout.write("* ")
        }
        console.log("");
}
```

</CodeBlock>

<br/>

# Diamond Pattern using Repeat method

<CodeBlock>

```js
let width = 10;

for (let i = 0; i < width; i++) {
        console.log(" ".repeat(width - i), " *".repeat(i));
}

for (let i = width; i != 0; i--) {
        console.log(" ".repeat(width - i), " *".repeat(i));
}

```

</CodeBlock>


## These are just a few examples of how you can use nested loops to create patterns in JavaScript. There are many other possibilities, so be creative and experiment!