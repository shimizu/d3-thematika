// Mock for d3-force
const MockSimulation = function(nodes) {
  this.nodes = nodes || [];
  this.forces = {};
  this.tickListeners = [];
  this._alpha = 1;
  this._alphaMin = 0.001;
  this._alphaDecay = 0.0228;
  this._alphaTarget = 0;
  this._velocityDecay = 0.4;
  this.running = false;
  
  return this;
};

MockSimulation.prototype.force = function(name, force) {
  if (arguments.length === 1) {
    return this.forces[name];
  }
  this.forces[name] = force;
  return this;
};

MockSimulation.prototype.on = function(type, listener) {
  if (type === 'tick') {
    this.tickListeners.push(listener);
  }
  return this;
};

MockSimulation.prototype.alpha = function(alpha) {
  if (arguments.length === 0) {
    return this._alpha;
  }
  this._alpha = alpha;
  return this;
};

MockSimulation.prototype.alphaDecay = function(decay) {
  if (arguments.length === 0) {
    return this._alphaDecay;
  }
  this._alphaDecay = decay;
  return this;
};

MockSimulation.prototype.restart = function() {
  this.running = true;
  // シミュレーションを一度だけ実行
  setTimeout(() => {
    this.tickListeners.forEach(listener => listener());
    this._alpha = 0;
    this.running = false;
  }, 0);
  return this;
};

MockSimulation.prototype.stop = function() {
  this.running = false;
  return this;
};

MockSimulation.prototype.tick = function() {
  this.tickListeners.forEach(listener => listener());
  return this;
};

const mockForceSimulation = jest.fn().mockImplementation((nodes) => {
  return new MockSimulation(nodes);
});

const mockForceLink = jest.fn().mockImplementation((links) => {
  const force = {
    links: links || [],
    strength: 0.1,
    distance: 30,
    iterations: 1
  };
  
  force.id = jest.fn().mockReturnValue(force);
  force.strength = jest.fn().mockReturnValue(force);
  force.distance = jest.fn().mockReturnValue(force);
  force.iterations = jest.fn().mockReturnValue(force);
  
  return force;
});

const mockForceManyBody = jest.fn().mockImplementation(() => {
  const force = {
    strength: -30,
    distanceMin: 1,
    distanceMax: Infinity,
    theta: 0.9
  };
  
  force.strength = jest.fn().mockReturnValue(force);
  force.distanceMin = jest.fn().mockReturnValue(force);
  force.distanceMax = jest.fn().mockReturnValue(force);
  force.theta = jest.fn().mockReturnValue(force);
  
  return force;
});

const mockForceCenter = jest.fn().mockImplementation((x, y) => {
  const force = {
    x: x || 0,
    y: y || 0,
    strength: 1
  };
  
  force.x = jest.fn().mockReturnValue(force);
  force.y = jest.fn().mockReturnValue(force);
  force.strength = jest.fn().mockReturnValue(force);
  
  return force;
});

const mockForceCollide = jest.fn().mockImplementation((radius) => {
  const force = {
    radius: radius || 1,
    strength: 1,
    iterations: 1
  };
  
  force.radius = jest.fn().mockReturnValue(force);
  force.strength = jest.fn().mockReturnValue(force);
  force.iterations = jest.fn().mockReturnValue(force);
  
  return force;
});

const mockForceX = jest.fn().mockImplementation((x) => {
  const force = {
    x: x || 0,
    strength: 0.1
  };
  
  force.x = jest.fn().mockReturnValue(force);
  force.strength = jest.fn().mockReturnValue(force);
  
  return force;
});

const mockForceY = jest.fn().mockImplementation((y) => {
  const force = {
    y: y || 0,
    strength: 0.1
  };
  
  force.y = jest.fn().mockReturnValue(force);
  force.strength = jest.fn().mockReturnValue(force);
  
  return force;
});

const mockForceRadial = jest.fn().mockImplementation((radius, x, y) => {
  const force = {
    radius: radius || 100,
    x: x || 0,
    y: y || 0,
    strength: 0.1
  };
  
  force.radius = jest.fn().mockReturnValue(force);
  force.x = jest.fn().mockReturnValue(force);
  force.y = jest.fn().mockReturnValue(force);
  force.strength = jest.fn().mockReturnValue(force);
  
  return force;
});

module.exports = {
  forceSimulation: mockForceSimulation,
  forceLink: mockForceLink,
  forceManyBody: mockForceManyBody,
  forceCenter: mockForceCenter,
  forceCollide: mockForceCollide,
  forceX: mockForceX,
  forceY: mockForceY,
  forceRadial: mockForceRadial
};