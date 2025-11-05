const gulp = require('gulp');
const connect = require('gulp-connect');
const audiosprite = require('./vendor/audiosprite');
const { globSync } = require('glob');
const shell = require('gulp-shell');
const fs = require('fs').promises;

gulp.task('audio', gulp.parallel(async function() {
  const files = globSync('./src/assets/sounds/*.mp3');
  const outputPath = './dist/audio';
  const opts = {
    output: outputPath,
    path: './',
    format: 'howler2',
    'export': 'ogg,mp3',
    loop: ['quacking', 'sniff']
  };

  return new Promise((resolve, reject) => {
    audiosprite(files, opts, async function(err, obj) {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }

      try {
        await fs.writeFile('./dist/audio' + '.json', JSON.stringify(obj, null, 2));
        resolve();
      } catch (writeErr) {
        reject(writeErr);
      }
    });
  });
}));

gulp.task('images', gulp.parallel(function(){
  // There is a texturepacker template for spritesmith but it doesn't work
  // well with complex directory structures, so instead we use the shell
  // checking TexturePacker --version first ensures it bails if TexturePacker
  // isn't installed
  return gulp.src('*', {read:false})
    .pipe(shell([
      'TexturePacker --version || echo ERROR: TexturePacker not found, install TexturePacker',
      'TexturePacker --disable-rotation --data dist/sprites.json --format json --sheet dist/sprites.png src/assets/images'
    ]))
    .pipe(connect.reload());
}));

gulp.task('deploy', gulp.parallel(function() {
  return gulp.src('*', {read:false})
    .pipe(shell([
    'aws --profile duckhunt s3 sync dist/ s3://duckhuntjs.com --include \'*\' --acl \'public-read\''
  ]));
}));

gulp.task('default', gulp.parallel('images', 'audio'));
