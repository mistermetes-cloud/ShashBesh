import unittest
import numpy as np
from train import loss_grad,forward,evaluate,selfplay_loss_grad
class TrainingTests(unittest.TestCase):
 def test_gradient_finite_difference_and_learning(self):
  rng=np.random.default_rng(7);x=rng.normal(size=(2,3,4));mask=np.ones((2,3),bool);target=np.array([[1.,0,0],[0,1,0]])
  params=[rng.normal(size=(4,3))*.1,np.zeros(3),rng.normal(size=3)*.1,np.zeros(1)]
  loss,grad=loss_grad(x,mask,target,params)
  eps=1e-5
  for p,g in zip(params,grad):
   for index in np.ndindex(p.shape):
    original=p[index];p[index]=original+eps;a=loss_grad(x,mask,target,params)[0];p[index]=original-eps;b=loss_grad(x,mask,target,params)[0];p[index]=original
    self.assertAlmostEqual(g[index],(a-b)/(2*eps),places=5)
  for _ in range(150):
   _,grads=loss_grad(x,mask,target,params)
   for p,g in zip(params,grads):p-=.1*g
  self.assertLess(loss_grad(x,mask,target,params)[0],loss*.5)
 def test_padding_does_not_change_probabilities(self):
  p=[np.ones((2,2)),np.zeros(2),np.ones(2),np.zeros(1)]
  x=np.array([[[1.,0],[0,1],[100,100]]]);mask=np.array([[True,True,False]]);target=np.array([[1.,0,0]])
  self.assertAlmostEqual(loss_grad(x,mask,target,p)[0],np.log(2),places=6)
 def test_selfplay_uses_both_wins_and_losses(self):
  rng=np.random.default_rng(3);x=rng.normal(size=(2,2,3));mask=np.ones((2,2),bool);chosen=np.array([0,1]);returns=np.array([1.,-1.])
  params=[rng.normal(size=(3,2))*.1,np.zeros(2),rng.normal(size=2)*.1,np.zeros(1)]
  loss,grads=selfplay_loss_grad(x,mask,chosen,returns,params);eps=1e-5
  for p,g in zip(params,grads):
   for index in np.ndindex(p.shape):
    original=p[index];p[index]=original+eps;a=selfplay_loss_grad(x,mask,chosen,returns,params)[0];p[index]=original-eps;b=selfplay_loss_grad(x,mask,chosen,returns,params)[0];p[index]=original
    self.assertAlmostEqual(g[index],(a-b)/(2*eps),places=5)
  for p,g in zip(params,grads):p-=.1*g
  self.assertLess(selfplay_loss_grad(x,mask,chosen,returns,params)[0],loss)
if __name__=='__main__':unittest.main()
