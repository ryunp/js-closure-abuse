# js-closure-abuse
An exploration into closures, and Object.bind()



This piece of code really tripped me up:

    Synth.prototype.sequence = function(queue, bpm, loops){

      // Get BPM delay in milliseconds
      var calculated_bpm = this.calculateBpm(bpm);

      // Play each sound, then wait for the offset
      for(i=0; i < queue.length; i++){
        ((function(offset){
          setTimeout((function(){
            this.play(queue[offset]);
          }).bind(this), offset * calculated_bpm)
        }).bind(this))(i);
      }
    };

Source: [Synth.js](https://github.com/garvank/synth-js)


So I began investigating. Thus, the result is inside the main.js file. Complete with thought process trailing the working code.
Here is a working demo: [JSFiddle](https://jsfiddle.net/ryunp/8nyq969t/1/)
