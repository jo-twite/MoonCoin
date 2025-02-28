import { ethers } from "hardhat";
import { expect } from "chai";



describe("MoonCoin", function () {
  let moonCoin: any;
  let deployer: any; // The owner of the total supply
  let recipient: any;
  let spender: any;

  const parseUnits = ethers.parseUnits;
  const totalSupply = parseUnits("1000001", 18); // Total supply: 1,000,001 MNC

  before(async () => {
    [deployer, recipient, spender] = await ethers.getSigners();
    const MoonCoin = await ethers.getContractFactory("MoonCoin");
    moonCoin = await MoonCoin.deploy();
    await moonCoin.deployed;
  });

  describe("totalSupply", function () {
    it("Should return expected total supply", async function () {
      const fetchedTotalSupply = await moonCoin.totalSupply();
      expect(totalSupply).to.equal((fetchedTotalSupply));
    });
  });

  describe("balanceOf", function () {
    it("Should return the expected balance for non empty wallet", async function () {
      const deployerBalance = await moonCoin.balanceOf(deployer.address);
      expect(deployerBalance).to.equal((totalSupply));
    });

    it("Should return an empty balance for empty wallet", async function () {
      const recipientBalance = await moonCoin.balanceOf(recipient.address);
      expect(recipientBalance).to.equal((0n));
    });
  });

  describe("transfer", function () {
    const amount = parseUnits("100", 18);
    describe("when recipient isn't zeroAddress", function () {
      describe("when deployer's balance is sufficient", function () {
        let initialDeployerBalance: bigint;
        let initialRecipientBalance: bigint;
        before(async function () {
          initialDeployerBalance = await moonCoin.balanceOf(deployer);
          initialRecipientBalance = await moonCoin.balanceOf(recipient);
        });

        it("then Transfer event should be emitted", async function () {
          await expect(moonCoin.connect(deployer).transfer(recipient.address, amount))
            .to.emit(moonCoin, "Transfer")
            .withArgs(deployer.address, recipient.address, amount);
        });

        it("and deployer balance should decrease", async function () {
          const updateBalance = await moonCoin.balanceOf(deployer);
          const newBalance = initialDeployerBalance - amount;
          expect(updateBalance).to.equal(newBalance);
        });

        it("and recipient balance should increase", async function () {
          const updateBalance = await moonCoin.balanceOf(recipient);
          expect(updateBalance)
            .to.equal(BigInt(initialRecipientBalance) + amount);
        });
      });

      describe("when deployer's balance is insufficient", function () {
        it("then transfer should be reverted ERC20InsufficientBalance", async function () {
          const depoloyerBalance = await moonCoin.balanceOf(deployer);
          await expect(moonCoin.connect(deployer).transfer(recipient, depoloyerBalance + 1n))
            .to.be.revertedWithCustomError(moonCoin, "ERC20InsufficientBalance")
            .withArgs(deployer, depoloyerBalance, depoloyerBalance + 1n);
        });
      });
    });
  });


  describe("allowance", function () {
    it("Should allow the deployer to approve allowances", async function () {
      const approvalAmount = parseUnits("1000", 18);

      // Approve spender
      await moonCoin.connect(deployer).approve(spender.address, approvalAmount);

      const allowance = await moonCoin.allowance(deployer.address, spender.address);
      expect(allowance).to.equal(approvalAmount);
    });
  });

  describe("approve", function () {
    const approvalAmount = parseUnits("200", 18);
    it("Should emit Approval events correctly", async function () {
      // Approve and check event
      await expect(
        moonCoin.connect(deployer).approve(spender.address, approvalAmount)
      )
        .to.emit(moonCoin, "Approval")
        .withArgs(deployer.address, spender.address, approvalAmount);
    });
    it("Should", async () => {
      expect(await moonCoin.allowance(deployer, spender))
        .to.equal(approvalAmount);
    });
  });

  describe("transferFrom", function () {
    it("Should revert when sending to zeroAddress", async function () {
      const transferAmount = parseUnits("300", 18);
      const zeroAddress = ethers.ZeroAddress;

      // Approve allowance for spender
      await moonCoin.connect(deployer).approve(spender.address, transferAmount);

      // Spender performs transferFrom successfully
      await expect(moonCoin.connect(spender).transferFrom(deployer, zeroAddress, transferAmount))
        .to.be.revertedWithCustomError(moonCoin, "ERC20InvalidReceiver")
        .withArgs(zeroAddress);
    });


    it("Should allow spender to transfer tokens", async function () {
      const amount = parseUnits("300", 18);
      const fromBalanceBefore = await moonCoin.balanceOf(deployer.address);
      const recipientBalanceBefore = await moonCoin.balanceOf(recipient.address);

      // Approve allowance for spender
      await moonCoin.connect(deployer).approve(spender.address, amount);

      // Spender performs transferFrom successfully
      await moonCoin.connect(spender).transferFrom(deployer.address, recipient.address, amount);

      expect(await moonCoin.balanceOf(recipient.address))
        .to.equal(recipientBalanceBefore + amount);

      expect(await moonCoin.balanceOf(deployer.address))
        .to.equal(fromBalanceBefore - amount);
    });

    it("Should fail  when allowance is exceeded", async function () {
      const transferAmount = parseUnits("200", 18);

      // Approve less than transfer amount
      await moonCoin.connect(deployer).approve(spender.address, transferAmount - BigInt(1));

      await expect(
        moonCoin.connect(spender).transferFrom(deployer.address, recipient.address, transferAmount)
      ).to.be.revertedWithCustomError(moonCoin, "ERC20InsufficientAllowance");
    });

    it("Should emit Transfer when transferFrom is successfull", async function () {
      const transferAmount = parseUnits("300", 18);

      // Approve allowance for spender
      await moonCoin.connect(deployer).approve(spender.address, transferAmount);

      // Spender performs transferFrom
      await expect(moonCoin.connect(spender).transferFrom(deployer.address, recipient.address, transferAmount))
        .to.emit(moonCoin, "Transfer")
        .withArgs(deployer.address, recipient.address, transferAmount);
    });
  });

  describe("neotransferFrom", function () {
    const zeroAddress: string = ethers.ZeroAddress;
    const amount: bigint = parseUnits("300", 18);

    describe("and the recipient is not zero addres", function () {
      describe("and the spender has enough allowance", function () {
        let spenderAllowanceBefore: any;
        before(async () => {
          moonCoin.connect(deployer).approve(spender, 2n * amount);
        });
        describe("and the token owner has enough balance", function () {
          let ownerBalanceBefore: any;
          let recipientBalanceBefore: any;
          before(async () => {
            ownerBalanceBefore = await moonCoin.balanceOf(deployer);
            recipientBalanceBefore = await moonCoin.balanceOf(recipient);


          });
          it("then succesfull transfer should emit an event", async function () {
            spenderAllowanceBefore = await moonCoin.allowance(deployer, spender);
            const spenderAllowanceBefore2 = await moonCoin.allowance(spender, deployer);

            expect(await moonCoin.connect(spender).transferFrom(deployer, recipient, amount))
              .to.emit(moonCoin, "Transfer").withArgs(deployer, recipient, amount);
          });
          it("and deployer allowance for spender shoud decrease", async function () {
            const spenderAllowanceAfter = await moonCoin.allowance(deployer, spender);

            expect(spenderAllowanceAfter).to.equal(spenderAllowanceBefore - amount);

          });
          it("and owner balance shoud decrease", async function () {
            expect(await moonCoin.balanceOf(deployer)).to.equal(ownerBalanceBefore - amount);
          });
          it("and receiver balance shoud increase", async function () {
            const recipientBalanceAfter = await moonCoin.balanceOf(recipient);
            expect(recipientBalanceAfter)
              .to.equal(recipientBalanceBefore + amount);
          });
        });

        describe("when the owner balance is insufficient", function () {

          it("then transfer should be reverted", async function () {
            const exceedingAmount = await moonCoin.balanceOf(deployer) + 1n;
            await moonCoin.connect(deployer).approve(spender.address, exceedingAmount);

            await expect(moonCoin.connect(spender).transferFrom(deployer, recipient, exceedingAmount))
              .to.be.revertedWithCustomError(moonCoin, "ERC20InsufficientBalance")
              .withArgs(deployer, exceedingAmount - 1n, exceedingAmount);
          });

        });
      });
      describe("when the spender doesn't have enough allowance", function () {
        it("should revert ERC20InsufficientAllowance", async function () {
          await moonCoin.connect(deployer).approve(spender.address, amount);

          await expect(moonCoin.connect(spender).transferFrom(deployer, recipient, amount + 1n))
            .to.be.revertedWithCustomError(moonCoin, "ERC20InsufficientAllowance")
            .withArgs(spender, amount, amount + 1n);
        });
      });
    });


    describe("when the recipient is zero addres", function () {
      it("should revert ERC20InvalidReceiver", async function () {
        await moonCoin.connect(deployer).approve(spender.address, amount);

        await expect(moonCoin.connect(spender).transferFrom(deployer, zeroAddress, amount))
          .to.be.revertedWithCustomError(moonCoin, "ERC20InvalidReceiver")
          .withArgs(zeroAddress);
      });
    });
    describe("when the spender has unlimited allowance", function () {
      it("does not decrease the spender allowance", async function () {
        await moonCoin.connect(deployer).approve(spender.address, ethers.MaxUint256);

        const allowanceBefore = await moonCoin.allowance(deployer.address, spender.address);

        expect(await moonCoin.connect(spender).transferFrom(deployer, recipient, amount))
          .to.emit(moonCoin, "Transfer")
          .withArgs(deployer.address, recipient.address, amount);;

        const allowanceAfter = await moonCoin.allowance(deployer.address, spender.address);
        await expect(allowanceAfter).to.equal(allowanceBefore);
      })
    })
  });
});
