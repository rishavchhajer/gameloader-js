import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/gameloader.umd.js',
        format: 'umd',
        name: 'GameLoader',
        exports: 'default',
      },
      {
        file: 'dist/gameloader.umd.min.js',
        format: 'umd',
        name: 'GameLoader',
        exports: 'default',
        plugins: [terser()],
      },
      {
        file: 'dist/gameloader.esm.js',
        format: 'es',
      },
      {
        file: 'dist/gameloader.esm.min.js',
        format: 'es',
        plugins: [terser()],
      },
    ],
  },
];
