/* Ryan Paul - 03/31/16 (revised 03/16/17)
 * Scope chains, closures, and bindign
 * https://github.com/ryunp/js-closure-abuse
 */


// Contextual Dependencies
var Test = function(elId) {

  this.root = document.getElementById(elId);
  this.displays = [];
};


// Behavoir
Test.prototype.play = function(name, string) {

  var newHtml = "<p>" + string + "</p>";

  var display = this.displays.find(d => d.name === name);

  if (!display) {
  	
  	div = document.createElement("div");
  	div.className = "display";
    this.root.appendChild(div);
  	
  	display = new Display(name, div);
  	this.displays.push(display)
  }

  display.el.insertAdjacentHTML("beforeend", newHtml);
};


// :<
Test.prototype.run_original = function(el, queue, ms) {

  var delay = ms;

  for (i = 0; i < queue.length; i++) {
    ((function(offset) {
      setTimeout((function() {
        this.play(el, queue[offset]);
      }).bind(this), offset * delay);
    }).bind(this))(i);
  }
};


// :|
Test.prototype.run_meh = function(el, queue, ms) {

  var delay = ms;

  for (i = 0; i < queue.length; i++) {
    setTimeout((function(item) {
      this.play(el, item);
    }).bind(this, queue[i]), delay * i);
  }
};


// :D
Test.prototype.run_cranked = function(el, queue, ms) {

  var delay = ms;

  for (i = 0; i < queue.length; i++)
    setTimeout(this.play.bind(this, el, queue[i]), delay * i);
};


// Model
var Display = function(name, el) {

	this.name = name;
	this.el = el;
}


/* 
 * Dooo eeeet
 */

var t = new Test("container");

t.run_original("original", ["This is run_original!", "1/10"], 2000);
t.run_meh("meh", ["This is run_meh!", "4/10"], 3000);
t.run_cranked("cranked", ["This is run_cranked!", "11/10"], 4000);