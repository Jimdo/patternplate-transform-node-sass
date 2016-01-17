import {dirname} from 'path';
import {render} from 'node-sass';

function renderSass(data, options) {
  return new Promise((resolve, reject) => {
    console.log('-------------->');
    console.log(data.split('\n').map(line => line.replace(/\s/g, '.')));
    render({
      ...options,
      data
    }, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });
  });
}

export default function(application) {
  return async function(file, demo, configuration) {
    // file.buffer
    // file.source
    // file.demoBuffer
    // file.demoSource

    let rendered = await renderSass(file.buffer.toString('utf-8'), {
      indentedSyntax: true,
      includePaths:  []
    });

    file.rendered = rendered.css;

    if (demo) {
      let renderedDemo = await renderSass(demo.buffer.toString('utf-8'), {
        indentedSyntax: true,
        includePaths:  [dirname(demo.path)]
      });
      file.demoBuffer = renderedDemo.css;
      file.demoSource = demo.source;
    }

    file.in = configuration.inFormat;
    file.out = configuration.outFormat;

    return file;
  }
}
